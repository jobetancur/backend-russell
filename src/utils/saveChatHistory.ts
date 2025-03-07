// Guardar hustorial de conversación en Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Definición de tipos
interface ChatMessage {
    user: 'client_message' | 'agent_message';
    message: string;
    date: string;
}

// interface ChatHistory {
//     id: number;
//     client_number: string;
//     messages: ChatMessage[];
// }

// Función para guardar o actualizar el historial del chat
export async function saveChatHistory(clientNumber: string, newMessage: string, isClient: boolean): Promise<void> {
    try {
        // Verificar si el cliente ya tiene un chat
        const { data: existingChat, error: fetchError } = await supabase
            .from('chat_history')
            .select('id, messages')
            .eq('client_number', clientNumber)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: No rows found
            throw new Error(`Error fetching data: ${fetchError.message}`);
        }

        const newEntry: ChatMessage = {
            user: isClient ? 'client_message' : 'agent_message',
            message: newMessage,
            date: new Date().toISOString()
        };

        if (existingChat) {
            // Si el cliente ya tiene un chat, agregar el nuevo mensaje al historial existente
            const updatedMessages: ChatMessage[] = [...existingChat.messages, newEntry];

            const { error: updateError } = await supabase
                .from('chat_history')
                .update({ messages: updatedMessages })
                .eq('id', existingChat.id);

            if (updateError) {
                throw new Error(`Error updating data: ${updateError.message}`);
            } else {
                console.log('Data updated successfully');
            }
        } else {
            // Si el cliente no tiene un chat, crear un nuevo registro con el historial inicial
            const updatedMessages: ChatMessage[] = [newEntry];

            const { error: insertError } = await supabase
                .from('chat_history')
                .insert([
                    {
                        client_number: clientNumber,
                        messages: updatedMessages
                    }
                ]);

            if (insertError) {
                throw new Error(`Error inserting data: ${insertError.message}`);
            } else {
                console.log('Data inserted successfully');
            }
        }
    } catch (error) {
        console.error(error);
    }
}

