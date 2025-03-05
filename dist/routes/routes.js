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
// import { v4 as uuidv4 } from 'uuid';
dotenv_1.default.config();
const router = express_1.default.Router();
const client = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// Ruta para enviar una plantilla de WhatsApp
router.post("/rusell/send-template", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        // await saveChatHistory(to, response.data.message.body, false);
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
