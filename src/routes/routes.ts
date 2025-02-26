import express from "express";
import dotenv from "dotenv";
import twilio from "twilio";
import axios from "axios";
// import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const router = express.Router();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Ruta para enviar una plantilla de WhatsApp
router.post("/rusell/send-template", async (req, res) => {
  const { to, name, service, templateId } = req.body;

  console.log("Name:", name, "Service:", service);
  
  try {
    const message = await client.messages.create({
      contentSid: templateId,
      contentVariables: JSON.stringify({ 1: name, 2: service }),
      from: 'whatsapp:+5745012081',
      to: `whatsapp:${to}`,
    });
    console.log("Mensaje enviado to:", to);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Traer el mensaje de la plantilla desde el endpoint /message/:sid con axios
    const response = await axios.get(
      `http://localhost:3020/russell/message/${message.sid}`
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