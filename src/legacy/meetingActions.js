// মাসিক সভার সারি যোগ/সরানো/বদল/সেভ ও "সভায় পাঠান" handler: app.js থেকে হুবহু সরানো, লজিক অপরিবর্তিত।
// App-এর state/setter/ref গুলো `c`-তে আসে; প্রতি রেন্ডারে নতুন করে কল হয়, তাই আচরণ আগের মতোই।
import { BN_MONTHS, toBn } from "./appHelpers.js";
import { saveMeetingData } from "./memberData.js";

export function createMeetingActions(c) {
  const {
    isGuestMode, setShowGuestSignIn, meetingDirtyRef, setMeetingState, meetingState,
    meetingCursor, reviewCursor, setSavingMeeting, setMeetingSavedTick
  } = c;
  function addMeetingRow() {
    if (isGuestMode) { setShowGuestSignIn(true); return; }
    meetingDirtyRef.current = true;
    setMeetingState(prev => ({
      ...prev,
      rows: [...(prev.rows || []), {
        id: String(Date.now()),
        topic: "",
        decision: "",
        person: ""
      }]
    }));
  }
  // মাসিক রিপোর্ট থেকে "সভায় পাঠান": সারিগুলো শুধু সভার local state-এ বসে (সেভ নয়; সেভ ব্যবহারকারী নিজে করেন)।
  // id নির্দিষ্ট ("mr-..."), তাই আবার পাঠালে একই সারি বদলায়, ডুপ্লিকেট হয় না। খালি placeholder সারি সরে যায়।
  function handleSendToMeeting(rows) {
    if (isGuestMode) { setShowGuestSignIn(true); return false; }
    if (!Array.isArray(rows) || !rows.length) return false;
    if (reviewCursor.year !== meetingCursor.year || reviewCursor.month0 !== meetingCursor.month0) {
      alert("সভা কার্ডে এখন অন্য মাস খোলা আছে। আগে সভা কার্ডে " + BN_MONTHS[reviewCursor.month0] + " " + toBn(reviewCursor.year) + " বেছে নিন, তারপর আবার পাঠান।");
      return false;
    }
    meetingDirtyRef.current = true;
    setMeetingState(prev => {
      const cur = Array.isArray(prev.rows) ? prev.rows : [];
      const base = cur.filter(r => r && (r.topic || r.decision || r.person));
      const incoming = new Map(rows.map(r => [r.id, r]));
      const merged = base.map(r => incoming.get(r.id) || r);
      const added = rows.filter(r => !base.some(b => b.id === r.id));
      return { ...prev, rows: [...merged, ...added] };
    });
    return true;
  }
  function removeMeetingRow(idx) {
    if (isGuestMode) { setShowGuestSignIn(true); return; }
    meetingDirtyRef.current = true;
    setMeetingState(prev => {
      const nextRows = [...prev.rows];
      nextRows.splice(idx, 1);
      return {
        ...prev,
        rows: nextRows
      };
    });
  }
  function updateMeetingRow(idx, field, value) {
    if (isGuestMode) { setShowGuestSignIn(true); return; }
    meetingDirtyRef.current = true;
    setMeetingState(prev => {
      const nextRows = [...prev.rows];
      nextRows[idx] = {
        ...nextRows[idx],
        [field]: value
      };
      return {
        ...prev,
        rows: nextRows
      };
    });
  }
  async function handleSaveMeeting() {
    setSavingMeeting(true);
    try {
      await saveMeetingData(meetingCursor.year, meetingCursor.month0, meetingState);
      meetingDirtyRef.current = false;
      setMeetingSavedTick(true);
      setTimeout(() => setMeetingSavedTick(false), 1600);
    } catch (err) {
      alert("মাসিক সভা সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setSavingMeeting(false);
    }
  }
  return { addMeetingRow, handleSendToMeeting, removeMeetingRow, updateMeetingRow, handleSaveMeeting };
}
