import schedule from 'node-schedule';
import { checkConversations } from './utils/checkConversations';

schedule.scheduleJob("0 * * * *", async () => {
    console.log("Running cron job...");
    await checkConversations();
});

// schedule.scheduleJob('*/1 * * * *', checkConversations); // Cada minuto
// schedule.scheduleJob("0 * * * *", checkConversations); // Cada hora