import express from "express";
import dotenv from "dotenv";
import twilio from "twilio";
import axios from "axios";
import fetch from 'node-fetch';
import { initializeApp } from "firebase/app";
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

dotenv.config();

const router = express.Router();

const MessagingResponse = twilio.twiml.MessagingResponse;
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const storage = getStorage();

router.post('/rusell/chat-dashboard', async (req, res) => {
  try {
    const twiml = new MessagingResponse();
    const { clientNumber, newMessage } = req.body;

    const isAudioMessage = await newMessage.includes('https://firebasestorage.googleapis.com/v0/b/ultim-admin-dashboard.appspot.com/o/audios');
    const isFileMessage = await newMessage.includes('https://firebasestorage.googleapis.com/v0/b/ultim-admin-dashboard.appspot.com/o/documents')

    if(isAudioMessage) {
      console.log('Audio message detected');
      // Descargar el archivo desde Firebase
      const audioUrl = newMessage;
      const response = await fetch(audioUrl);
      const audioBuffer = await response.buffer();

      const tempDir = path.join(__dirname, '../temp'); // Subir un nivel desde routes
      const tempInputPath = path.join(tempDir, 'tempInput.webm');
      const tempOutputPath = path.join(tempDir, 'tempOutput.mp3');

      // Guardar el archivo temporal
      fs.writeFileSync(tempInputPath, new Uint8Array(audioBuffer));

      // Convertir a formato OGG usando ffmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
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
      const audioName = `audio_${uuidv4()}.mp3`;
      const storageRef = ref(storage, `ogg/${audioName}`);
      const metadata = {
        contentType: 'audio/mpeg',
      };
      const uploadTask = uploadBytesResumable(storageRef, fs.readFileSync(tempOutputPath), metadata);

      console.log('Nombre creado', audioName);

      // Esperar a que la subida complete y obtener la URL pública
      uploadTask.on('state_changed',
        (snapshot) => {
          // Progreso de la subida (opcional)
          console.log('Upload is in progress...');
        },
        (error) => {
          throw new Error(`Upload failed: ${error.message}`);
        },
        async () => {
          // Subida completada
          const audioUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('Audio URL:', audioUrl);
          // Envía el archivo de audio a través de Twilio
          await client.messages.create({
            body: "Audio message",
            to: `whatsapp:${clientNumber}`,
            from: `whatsapp:+5745012080`,
            mediaUrl: [audioUrl],
          });
          // Limpiar archivos temporales
          fs.unlinkSync(tempInputPath);
          fs.unlinkSync(tempOutputPath);
          console.log('Audio message sent successfully', audioUrl);
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          res.end(twiml.toString());
        }
      );
      
    } else if(isFileMessage) {
      console.log('File message detected');
      const message = await client.messages.create({
        body: 'Mensaje con archivo',
        to: `whatsapp:${clientNumber}`,
        from: `whatsapp:+5745012080`,
        mediaUrl: [newMessage],
      });
      console.log('File message sent successfully:', message.sid);
      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(twiml.toString());
    } else {

      // Enviar mensaje a través de Twilio
      const message = await client.messages.create({
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
  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).send({ 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    });
  }
});

// Ruta para enviar una plantilla de WhatsApp
router.post("/rusell/send-template", async (req, res) => {
  const { to, name, service, templateId } = req.body;

  console.log("Name:", name, "Service:", service);

  let localName = name ? name : "señor usuario";
  let localService = service ? service : "por el que nos contacta";
  
  try {
    const message = await client.messages.create({
      contentSid: templateId,
      contentVariables: JSON.stringify({ 1: localName, 2: localService }),
      from: 'whatsapp:+5745012081',
      to: `whatsapp:${to}`,
    });
    console.log("Mensaje enviado to:", to);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Traer el mensaje de la plantilla desde el endpoint /message/:sid con axios
    const response = await axios.get(
      `https://ultim.online/russell/message/${message.sid}`
    );

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
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error al enviar la plantilla",
        error: (error as any).message,
      });
  }
});

// Ruta para obtener detalles de un mensaje específico por SID
router.get("/russell/message/:sid", async (req, res) => {
  const { sid } = req.params;

  try {
    const message = await client.messages(sid).fetch();
    res.status(200).json({ success: true, message });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error al obtener el mensaje",
        error: (error as any).message,
      });
  }
});

// Ruta principal
router.get("/russell/back-test", (req, res) => {
  res.send("Servidor Back-Russell funcionando correctamente con Typescript y Express.");
});

export default router;