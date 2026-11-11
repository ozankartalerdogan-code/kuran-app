import { defineStrings } from "../index";

// useFavorites / useNotes hata mesajları + tecvid lejantı (kural kodu = renk)
export default defineStrings({
  tr: {
    favLoad: "Favoriler yüklenemedi",
    favQuota: "Depolama alanı dolu, favori güncellenemedi.",
    favUpdate: "Favori güncellenemedi",
    notesLoad: "Notlar yüklenemedi",
    notesQuota: "Depolama alanı dolu, not kaydedilemedi.",
    noteSave: "Not kaydedilemedi",
    "#e11d48": "Med (uzatma)",
    "#16a34a": "Ğunne / İhfâ / İdgâm",
    "#2563eb": "Kalkale",
    "#9ca3af": "Sessiz harf",
  },
  en: {
    favLoad: "Couldn't load favorites",
    favQuota: "Storage is full; the favorite couldn't be updated.",
    favUpdate: "Couldn't update the favorite",
    notesLoad: "Couldn't load notes",
    notesQuota: "Storage is full; the note couldn't be saved.",
    noteSave: "Couldn't save the note",
    "#e11d48": "Madd (elongation)",
    "#16a34a": "Ghunnah / Ikhfa / Idgham",
    "#2563eb": "Qalqalah",
    "#9ca3af": "Silent letter",
  },
});
