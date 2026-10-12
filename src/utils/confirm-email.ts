import {ui} from "./utils.js";
import { sendPendingEmail, clearPendingEmail } from "../tools/send-email.js";
export async function sendFinalEmail(draft: any, rl : any): Promise<void> {
    if (draft) {
    console.log(`${ui.yellow}${ui.bold}  Email awaiting confirmation${ui.reset}`);
    console.log(`  To:      ${draft.to}`);
    console.log(`  Subject: ${draft.subject}`);
    console.log(`  Body:    ${draft.text}`);

    const confirmation = (
        await rl.question(
        `\n${ui.yellow}Send this email? Type "yes" to send, or anything else to cancel: ${ui.reset}`,
        )
    )
        .trim()
        .toLowerCase();

    if (confirmation === "yes") {
        try {
        await sendPendingEmail();
        console.log(
            `\n${ui.green}✓ Email sent successfully.${ui.reset}\n`,
        );
        } catch (error: unknown) {
        const details =
            error instanceof Error ? error.message : String(error);

        console.log(
            `\n${ui.red}✗ Email sending failed: ${details}${ui.reset}\n`,
        );
        }
    } else {
        clearPendingEmail();
        console.log(`\n${ui.gray}Email cancelled. Nothing was sent.${ui.reset}\n`);
    }
    }

}