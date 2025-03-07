"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const twilio_1 = __importDefault(require("twilio"));
const axios_1 = __importDefault(require("axios"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const app_1 = require("firebase/app");
const storage_1 = require("firebase/storage");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs_1 = __importDefault(require("fs"));
const saveChatHistory_1 = require("../utils/saveChatHistory");
dotenv_1.default.config();
const router = express_1.default.Router();
const MessagingResponse = twilio_1.default.twiml.MessagingResponse;
const client = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};
const app = (0, app_1.initializeApp)(firebaseConfig);
const storage = (0, storage_1.getStorage)();
router.post('/russell/chat-dashboard', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Request body:', req.body.clientNumber, req.body.newMessage);
    try {
        const twiml = new MessagingResponse();
        const { clientNumber, newMessage } = req.body;
        const isAudioMessage = yield newMessage.includes('https://firebasestorage.googleapis.com/v0/b/ultim-admin-dashboard.appspot.com/o/audios');
        const isFileMessage = yield newMessage.includes('https://firebasestorage.googleapis.com/v0/b/ultim-admin-dashboard.appspot.com/o/documents');
        if (isAudioMessage) {
            console.log('Audio message detected');
            // Descargar el archivo desde Firebase
            const audioUrl = newMessage;
            const response = yield (0, node_fetch_1.default)(audioUrl);
            const audioBuffer = yield response.buffer();
            const tempDir = path_1.default.join(__dirname, '../temp'); // Subir un nivel desde routes
            const tempInputPath = path_1.default.join(tempDir, 'tempInput.webm');
            const tempOutputPath = path_1.default.join(tempDir, 'tempOutput.mp3');
            // Guardar el archivo temporal
            fs_1.default.writeFileSync(tempInputPath, new Uint8Array(audioBuffer));
            // Convertir a formato OGG usando ffmpeg
            yield new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(tempInputPath)
                    .output(tempOutputPath)
                    .inputOptions('-f', 'webm')
                    .audioCodec('libmp3lame')
                    .on('start', (commandLine) => {
                    console.log('Comando FFmpeg:', commandLine);
                })
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });
            // Subir el audio convertido a Firebase Storage a la capeta audios
            const audioName = `audio_${(0, uuid_1.v4)()}.mp3`;
            const storageRef = (0, storage_1.ref)(storage, `ogg/${audioName}`);
            const metadata = {
                contentType: 'audio/mpeg',
            };
            const uploadTask = (0, storage_1.uploadBytesResumable)(storageRef, fs_1.default.readFileSync(tempOutputPath), metadata);
            console.log('Nombre creado', audioName);
            // Esperar a que la subida complete y obtener la URL pública
            uploadTask.on('state_changed', (snapshot) => {
                // Progreso de la subida (opcional)
                console.log('Upload is in progress...');
            }, (error) => {
                throw new Error(`Upload failed: ${error.message}`);
            }, () => __awaiter(void 0, void 0, void 0, function* () {
                // Subida completada
                const audioUrl = yield (0, storage_1.getDownloadURL)(uploadTask.snapshot.ref);
                console.log('Audio URL:', audioUrl);
                // Envía el archivo de audio a través de Twilio
                yield client.messages.create({
                    body: "Audio message",
                    to: `whatsapp:${clientNumber}`,
                    from: 'whatsapp:+5745012081',
                    mediaUrl: [audioUrl],
                });
                // Limpiar archivos temporales
                fs_1.default.unlinkSync(tempInputPath);
                fs_1.default.unlinkSync(tempOutputPath);
                console.log('Audio message sent successfully', audioUrl);
                res.writeHead(200, { 'Content-Type': 'text/xml' });
                res.end(twiml.toString());
            }));
        }
        else if (isFileMessage) {
            console.log('File message detected');
            const message = yield client.messages.create({
                body: 'Mensaje con archivo',
                to: `whatsapp:${clientNumber}`,
                from: 'whatsapp:+5745012081',
                mediaUrl: [newMessage],
            });
            console.log('File message sent successfully:', message.sid);
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(twiml.toString());
        }
        else {
            // Enviar mensaje a través de Twilio
            const message = yield client.messages.create({
                // from: 'whatsapp:+14155238886', // Número de Twilio de pruebas
                from: `whatsapp:+5745012081`, // Número de Russell Bedford
                to: `whatsapp:${clientNumber}`,
                body: newMessage
            });
            // Enviar respuesta al frontend
            res.status(200).send({
                success: true,
                message: 'Mensaje enviado exitosamente',
                sid: message.sid
            });
        }
    }
    catch (error) {
        console.error('Error in chat route:', error);
        res.status(500).send({
            error: error instanceof Error ? error.message : "An unknown error occurred"
        });
    }
}));
// Ruta para enviar una plantilla de WhatsApp
router.post("/russell/send-template", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { to, name, service, templateId } = req.body;
    console.log("Name:", name, "Service:", service);
    let localName = name ? name : "señor usuario";
    let localService = service ? service : "por el que nos contacta";
    try {
        const message = yield client.messages.create({
            contentSid: templateId,
            contentVariables: JSON.stringify({ 1: localName, 2: localService }),
            from: 'whatsapp:+5745012081',
            to: `whatsapp:${to}`,
        });
        console.log("Mensaje enviado to:", to);
        yield new Promise((resolve) => setTimeout(resolve, 2000));
        // Traer el mensaje de la plantilla desde el endpoint /message/:sid con axios
        const response = yield axios_1.default.get(`https://ultim.online/russell/message/${message.sid}`);
        // console.log("response", response.data.message.body);
        // Guardar el mensaje en la base de datos (simulado)
        yield (0, saveChatHistory_1.saveChatHistory)(to, response.data.message.body, false);
        res
            .status(200)
            .json({
            success: true,
            message: response.data.message.body,
            sid: message.sid,
        });
    }
    catch (error) {
        res
            .status(500)
            .json({
            success: false,
            message: "Error al enviar la plantilla",
            error: error.message,
        });
    }
}));
// Ruta para obtener detalles de un mensaje específico por SID
router.get("/russell/message/:sid", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sid } = req.params;
    try {
        const message = yield client.messages(sid).fetch();
        res.status(200).json({ success: true, message });
    }
    catch (error) {
        res
            .status(500)
            .json({
            success: false,
            message: "Error al obtener el mensaje",
            error: error.message,
        });
    }
}));
// Ruta principal
router.get("/russell/back-test", (req, res) => {
    res.send("Servidor Back-Russell funcionando correctamente con Typescript y Express.");
});
exports.default = router;
