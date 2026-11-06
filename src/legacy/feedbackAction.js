// "আমাদের জানান" (ফিডব্যাক) পাঠানোর handler: app.js থেকে হুবহু সরানো, লজিক অপরিবর্তিত।
// Web3Forms-এ Family Username আগের মতোই বার্তার সাথে পাঠানো হয়। App-এর state/setter গুলো `c`-তে আসে।
import { getFamilyCode } from "./familyIdentity.js";

const WEB3FORMS_ACCESS_KEY = "4e0befa2-68c6-4c9e-92fb-ecffa3b4b2de";

export function createFeedbackAction(c) {
  const { feedbackMsg, feedbackSending, setFeedbackSending, setFeedbackStatus, setFeedbackMsg, setShowFeedbackModal } = c;
  async function handleSendFeedback() {
    if (!feedbackMsg.trim() || feedbackSending) return;
    setFeedbackSending(true);
    setFeedbackStatus(null);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: "Daily Task App — নতুন পরামর্শ",
          message: `${feedbackMsg}\n\nFamily Username: ${getFamilyCode()}`
        })
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Request failed");
      setFeedbackStatus("sent");
      setFeedbackMsg("");
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackStatus(null);
      }, 1200);
    } catch (err) {
      setFeedbackStatus("error");
    } finally {
      setFeedbackSending(false);
    }
  }
  return { handleSendFeedback };
}
