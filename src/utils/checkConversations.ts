import { supabase } from "./supabase";
// --------------------------------------------------

type Conversation = {
    id: string;
    messages: { date: string }[];
    client_number: string;
    client_name?: string;
    notification_1: boolean;
    notification_3: boolean;
    notification_5: boolean;
    notifications: boolean;
};

// Función principal para verificar conversaciones y enviar notificaciones
const checkConversations = async (): Promise<void> => {
  console.log("Checking conversations...");

  // Consultar las conversaciones donde el acuerdo no se ha completado
  const { data: conversations, error } = await supabase
    .from("chat_history")
    .select("*")
    .eq("notification", true);
  
  if (error) {
    console.error("Error fetching conversations:", error);
    return;
  }

  const now = new Date();

  for (const conversation of conversations as Conversation[]) {
    const isNotification = conversation.notifications;
    const notification_1 = conversation.notification_1
    const notification_3 = conversation.notification_3
    const notification_5 = conversation.notification_5
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const lastMessageDate = new Date(lastMessage.date);
    const timeDiff = now.getTime() - lastMessageDate.getTime();

    // Enviar la primera notificación si han pasado entre 1 y 3 horas sin respuesta
    // if (!conversation.notification_sent && timeDiff >= 1 * 60 * 60 * 1000 && timeDiff <= 3 * 60 * 60 * 1000) {
    //     simulateNotification(conversation, "First reminder: Unfinished conversation.");
    //     await markNotificationSent(conversation.id);
    // }
    
    //* Producción --------------------------------------------------
    // Enviar un recordatorio después de 24 horas
    // if (timeDiff >= 24 * 60 * 60 * 1000 && timeDiff < 48 * 60 * 60 * 1000 && isNotification) {
    //   simulateMessage(conversation.client_number, conversation.client_name, "Reminder after 24 hours");
    // }
    
    // // Enviar un recordatorio después de 3 días
    // if (timeDiff >= 3 * 24 * 60 * 60 * 1000 && timeDiff < 4 * 24 * 60 * 60 * 1000 && isNotification) {
    //   simulateMessage(conversation.client_number, conversation.client_name, "Reminder after 3 days");
    // }
    
    // // Enviar un recordatorio final después de 5 días
    // if (timeDiff >= 5 * 24 * 60 * 60 * 1000 && timeDiff < 6 * 24 * 60 * 60 * 1000 && isNotification) {
    //   simulateMessage(conversation.client_number, conversation.client_name, "Final reminder after 5 days");
    //   // await markNotification(conversation.id);
    // }
    //* --------------------------------------------------

    //! Pruebas --------------------------------------------------
    // Enviar un recordatorio después de 1 minuto
    if (timeDiff >= 1 * 60 * 1000 && timeDiff < 2 * 60 * 1000 && !notification_1) {
      simulateMessage(conversation.client_number, conversation.client_name, "Reminder after 1 minute");
      await markNotification_1(conversation.id);
      console.log('notification_1:', notification_1);
    }
  
    // Enviar un recordatorio después de 3 minutos
    if (timeDiff >= 3 * 60 * 1000 && timeDiff < 5 * 60 * 1000 && !notification_3) {
        simulateMessage(conversation.client_number, conversation.client_name, "Reminder after 3 minutes");
        await markNotification_3(conversation.id);
        console.log('notification_3:', notification_3);
    }

    // Enviar un recordatorio final después de 5 minutos
    if (timeDiff >= 5 * 60 * 1000 && timeDiff < 6 * 60 * 1000 && !notification_5) {
        simulateMessage(conversation.client_number, conversation.client_name, "Final reminder after 5 minutes");
        await markNotification_5(conversation.id);
        console.log('notification_5:', notification_5);
        // await markNotification(conversation.id);
    }
    //! --------------------------------------------------

  }
};

// Función para simular el envío de un mensaje al cliente
const simulateMessage = (phoneNumber: string, clientName: string = 'señor usuario', message: string): void => {
  console.log(`Sending message to ${clientName} (${phoneNumber}): ${message}`);
};

// Función para marcar una conversación como notificada en la base de datos
const markNotification = async (conversationId: string): Promise<void> => {
  await supabase
    .from("chat_history")
    .update({ notification: false })
    .eq("id", conversationId);
};

// Función para marcar notification_1 como true
const markNotification_1 = async (conversationId: string): Promise<void> => {
    await supabase
      .from("chat_history")
      .update({ notification_1: true })
      .eq("id", conversationId);
};

// Función para marcar notification_3 como true
const markNotification_3 = async (conversationId: string): Promise<void> => {
    await supabase
      .from("chat_history")
      .update({ notification_3: true })
      .eq("id", conversationId);
};

// Función para marcar notification_5 como true
const markNotification_5 = async (conversationId: string): Promise<void> => {
    await supabase
      .from("chat_history")
      .update({ notification_5: true })
      .eq("id", conversationId);
};
 
export { checkConversations };