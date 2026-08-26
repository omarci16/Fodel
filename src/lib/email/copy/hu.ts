/**
 * Hungarian email copy.
 *
 * This file is the shape; src/lib/email/copy/nl.ts must match it exactly and
 * is type-checked against it (`satisfies typeof HU`), so adding a template
 * here without translating it there is a compile error rather than a
 * Hungarian email arriving in a Dutch inbox.
 *
 * Tone follows FODEL's own published writing: formal "Ön", plain sentences,
 * no exclamation marks, and never more words than the message needs. Their
 * sellers are frequently pensioners — clarity outranks warmth, and both
 * outrank marketing voice.
 */
export const HU = {
  common: {
    greeting: (name: string) => `Kedves ${name}!`,
    greetingNoName: 'Tisztelt Hirdetőnk!',
    signOff: 'Üdvözlettel,\nFODEL Ingatlan',
    questions: 'Ha bármi kérdése van, egyszerűen válaszoljon erre az e-mailre.',
    linkFallback: 'Ha a gomb nem működik, másolja be ezt a címet a böngészőjébe:',
  },

  registrationConfirm: {
    subject: 'Erősítse meg hirdetésfeladását — FODEL',
    preheader: 'Már csak egy lépés: állítson be egy jelszót, és folytassa a hirdetés összeállítását.',
    heading: 'Már csak egy lépés',
    intro: (settlement: string) =>
      `Köszönjük, hogy a FODEL-t választotta${settlement ? ` a(z) ${settlement} településen lévő ingatlanához` : ''}. Az adatait megkaptuk.`,
    body: 'Az alábbi gombra kattintva beállíthat egy jelszót, és azonnal folytathatja a hirdetés összeállítását — az adatok, amiket megadott, már be vannak töltve.',
    cta: 'Hirdetés folytatása',
    expiry: 'A link 7 napig érvényes. Ha nem Ön kezdeményezte a hirdetésfeladást, nyugodtan hagyja figyelmen kívül ezt a levelet — nem jön létre fiók.',
  },

  invite: {
    subject: 'Meghívó a FODEL portálra',
    preheader: 'Állítsa be jelszavát, és lépjen be a hirdetői felületre.',
    heading: 'Meghívást kapott a FODEL portálra',
    body: (role: string) =>
      `A FODEL meghívta Önt, hogy ${role} csatlakozzon a portálhoz, ahol az ingatlanhirdetéseket kezelheti.`,
    roleAdmin: 'adminisztrátorként',
    roleOwner: 'hirdetőként',
    cta: 'Meghívó elfogadása',
    expiry: 'A link 7 napig érvényes, és csak egyszer használható fel.',
  },

  welcome: {
    subject: 'Üdvözöljük a FODEL portálon',
    preheader: 'A fiókja aktív. Így adhatja fel az első hirdetését.',
    heading: (name: string) => `Üdvözöljük, ${name}`,
    body: 'A fiókja aktív. A portálon összeállíthatja hirdetését, fényképeket tölthet fel, és nyomon követheti, hol tart az elbírálás.',
    stepsTitle: 'Amire szüksége lesz',
    steps: [
      'Fényképek az ingatlanról — legalább egy, de minél több, annál jobb',
      'Az ingatlan alapadatai: alapterület, telekméret, irányár',
      'Néhány mondat arról, mitől különleges az ingatlan',
    ],
    cta: 'Ugrás a portálra',
  },

  submissionReceived: {
    subject: (ref: string) => `Hirdetését megkaptuk — #${ref}`,
    preheader: 'Munkatársunk átnézi, és e-mailben jelentkezünk.',
    heading: 'Hirdetését elbírálásra megkaptuk',
    body: (title: string, ref: string) =>
      `A(z) „${title}” (#${ref}) hirdetését megkaptuk. Munkatársunk átnézi, és amint döntés született, e-mailben értesítjük.`,
    timing: 'Az elbírálás általában két munkanapon belül megtörténik.',
    note: 'Amíg az elbírálás tart, a hirdetés nem szerkeszthető. Ha javítást kérünk, azonnal újra megnyílik.',
  },

  adminNewSubmission: {
    subject: (ref: string) => `Elbírálásra vár — #${ref}`,
    preheader: 'Új hirdetés érkezett a portálra.',
    heading: 'Új hirdetés vár elbírálásra',
    cta: 'Elbírálás megnyitása',
    labels: {
      ref: 'Azonosító',
      title: 'Cím',
      owner: 'Hirdető',
      email: 'E-mail',
      location: 'Helyszín',
      price: 'Irányár',
      photos: 'Fényképek',
      languages: 'Nyelvek',
    },
  },

  changesRequested: {
    subject: (ref: string) => `Javítás szükséges — #${ref}`,
    preheader: 'Egy apró javítás kell, mielőtt élesíthetjük a hirdetést.',
    heading: 'Kérjük, javítsa hirdetését',
    body: (title: string, ref: string) =>
      `A(z) „${title}” (#${ref}) hirdetésével kapcsolatban munkatársunk az alábbi megjegyzést fűzte:`,
    after: 'A hirdetés újra szerkeszthető. Kérjük, végezze el a javítást, majd küldje be ismét — a folyamat innen ugyanúgy folytatódik.',
    cta: 'Hirdetés javítása',
  },

  approvedAwaitingPayment: {
    subject: (ref: string) => `Jóváhagyva — #${ref} · már csak a díj rendezése van hátra`,
    preheader: 'A hirdetést jóváhagytuk. A díj beérkezése után azonnal élesedik.',
    heading: 'Hirdetését jóváhagytuk',
    body: (title: string, ref: string) =>
      `Jó hír: a(z) „${title}” (#${ref}) hirdetését átnéztük és jóváhagytuk. Már csak a hirdetési díj rendezése van hátra — a fizetés beérkezése után a hirdetés azonnal megjelenik.`,
    orderTitle: 'A hirdetés díja',
    totalLabel: 'Fizetendő',
    ctaCard: 'Fizetés bankkártyával',
    cardNote: 'A fizetés a Stripe biztonságos felületén történik. A kártyaadatokat a FODEL nem látja és nem tárolja.',
    bankTitle: 'Vagy banki átutalással',
    bankNote: (ref: string) =>
      `Átutaláskor kérjük, a közleménybe írja be a hirdetés azonosítóját: ${ref}. Az átutalás beérkezése után munkatársunk élesíti a hirdetést.`,
    vatNote: 'A feltüntetett árak a 21% holland áfát tartalmazzák.',
  },

  paymentReceipt: {
    subject: (ref: string) => `Fizetési visszaigazolás — #${ref}`,
    preheader: 'Köszönjük, a fizetés megérkezett.',
    heading: 'Köszönjük, a fizetés megérkezett',
    body: (title: string, ref: string) =>
      `A(z) „${title}” (#${ref}) hirdetés díját megkaptuk. A hirdetés élesítve, és mostantól látható a fodel.nl oldalon.`,
    orderTitle: 'Tételek',
    totalLabel: 'Fizetett összeg',
    vatNote: 'Az összeg a 21% holland áfát tartalmazza. A számlát külön e-mailben küldjük.',
    paidAtLabel: 'Fizetés dátuma',
  },

  published: {
    subject: (ref: string) => `Hirdetése élesedett — #${ref}`,
    preheader: 'A hirdetés mostantól látható a fodel.nl oldalon.',
    heading: 'Hirdetése mostantól élő',
    body: (title: string, ref: string) =>
      `A(z) „${title}” (#${ref}) hirdetése megjelent a fodel.nl oldalon, és nyolc ország vásárlói számára elérhető.`,
    cta: 'Hirdetés megtekintése',
    next: 'Ha valaki érdeklődik, azonnal e-mailt küldünk Önnek az érdeklődő adataival. A hirdetés állapotát bármikor megnézheti a portálon.',
  },

  newEnquiry: {
    subject: (ref: string) => `Új érdeklődő — #${ref}`,
    preheader: 'Valaki érdeklődik az ingatlana iránt.',
    heading: 'Új érdeklődő a hirdetésére',
    body: (title: string, ref: string) =>
      `A(z) „${title}” (#${ref}) hirdetésére új érdeklődő jelentkezett:`,
    labels: { name: 'Név', email: 'E-mail', phone: 'Telefon' },
    messageTitle: 'Üzenete',
    advice: 'Javasoljuk, hogy két napon belül vegye fel a kapcsolatot az érdeklődővel — a gyors válasz a legfontosabb tényező abban, hogy létrejön-e az adásvétel.',
  },

  passwordReset: {
    subject: 'Jelszó visszaállítása — FODEL portál',
    preheader: 'A link egy óráig érvényes.',
    heading: 'Jelszó visszaállítása',
    body: 'Jelszó-visszaállítási kérelmet kaptunk a FODEL portál fiókjához. Az alábbi gombra kattintva állíthat be újat.',
    cta: 'Új jelszó beállítása',
    expiry: 'A link egy óráig érvényes, és csak egyszer használható fel.',
    ignore: 'Ha nem Ön kérte a visszaállítást, hagyja figyelmen kívül ezt a levelet — a jelszava változatlan marad, és nem történik semmi.',
  },
};
// Deliberately not `as const`: this object's *shape* is the contract that
// nl.ts is checked against. Literal types would make that check demand
// identical strings in both languages, which is the opposite of the point.
