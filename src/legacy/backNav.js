// ব্যাক বাটন সাপোর্ট: একটা "layer" খুললে(ট্যাব/সাব-পেজ) ১টা history entry যোগ হয়;
// ব্যাক চাপলে অ্যাপ থেকে বেরোনোর বদলে layer বন্ধ হয়(onBack)। UI-এর নিজস্ব back বাটনে
// layer বন্ধ হলে entry-টাও মুছে ফেলা হয়, যাতে ব্যাক-ইতিহাসে অতিরিক্ত জমা না থাকে।
// depth(history.state.dt) দিয়ে nested layer আলাদা রাখা হয় — শুধু যে layer-এর entry pop
// হয়েছে সেটাই সাড়া দেয়। React global(window.React)।
export function useBackLayer(active, onBack) {
  const cb = React.useRef(onBack);
  cb.current = onBack;
  React.useEffect(() => {
    if (!active) return undefined;
    let pushed = false;
    let depth = 0;
    try {
      depth = ((window.history.state && window.history.state.dt) || 0) + 1;
      window.history.pushState({ dt: depth }, "");
      pushed = true;
    } catch {
      return undefined;
    }
    const onPop = () => {
      const cur = (window.history.state && window.history.state.dt) || 0;
      if (pushed && cur < depth) {
        pushed = false;
        cb.current();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (pushed) {
        pushed = false;
        try { window.history.back(); } catch {}
      }
    };
  }, [active]);
}
