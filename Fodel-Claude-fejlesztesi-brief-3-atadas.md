# FODEL — 3. fejlesztési brief átadása

Dátum: 2026. szeptember 29.

A kód helyben kész. **Nincs commit, nincs push.** A `0015_brief3.sql` migrációt a fejlesztés alatt nem futtattuk az éles adatbázison — azt Gábor vagy Richárd futtatja kézzel. Nyilvános űrlapot a dev szerveren nem küldtünk be: a `localhost:4321` az éles adatbázishoz csatlakozik, és valós postaládákba ír.

---

## 1. Mi készült el, és hol lehet megnézni

### Cégnév és domain: fodel.eu

A weboldal kanonikus címe mostantól a **fodel.eu**. Minden kereső, sitemap, robots, RSS, e-mail-link és jogi oldal ebből a címből dolgozik. A kód alapértelmezett levelezési címe: **info@fodel.eu**.

A láblécben a cím akkor válik `info@fodel.eu`-vá, ha a 0015 lefut, és a beállításban még a régi magérték (`info@fodel.nl`) szerepel. Ha valaki már átírta a címet a Beállításokban, a migráció azt nem nyúlja.

Megnézni: [http://localhost:4321/hu/](http://localhost:4321/hu/) — görgess a lap aljára. Holland: [http://localhost:4321/nl/](http://localhost:4321/nl/).

### WhatsApp

Éva és Gábor számát (`+31 6 1528 2212`) a 0015 beírja, **csak ha a mező eddig üres volt**. Utána a gomb megjelenik a főoldalon, a kapcsolat oldalon és egy ingatlanoldalon. A süti-banner alatt a lebegő gomb nem takarja a banner gombjait.

Megnézni a 0015 után: főoldal, [kapcsolat](http://localhost:4321/hu/kapcsolat/), egy élő ingatlanoldal.

### Magyar tulajdonosi meghívó

A jóváhagyott magyar levél a 0015-ben van, Éva és Gábor szövegével, a bekezdésekkel együtt. A **tárgy** és a **gomb** a mi javaslatunk:

- tárgy: *Meghívó a FODEL Ingatlan online felületére*
- gomb: *Ingatlanom regisztrálása*

Ezeket a sablonszerkesztőben külön jelezzük. Adminmeghívóra soha nem ez a levél megy, hanem a beépített adminszöveg.

Megnézni: [http://localhost:4321/dev/emails](http://localhost:4321/dev/emails) — `inviteOwnerApprovedHu` és `inviteAdminAfterApproval`. A portálon: Beállítások → Meghívólevelek.

### Hirdetésfeladás: fotótipp és helyszíni szolgáltatás

A tulajdonos a feladáskor rövid fotózási tanácsot kap, és két helyszíni szolgáltatást kérhet:

- **150 €** — helyszíni profi fotó, videó és drón
- **200 €** — Gábor helyszíni látogatása: profi fotó és videó, plusz részletes személyes értékbecslés

A kettő egyszerre nem kérhető. Alapból „Nem kérem”. Most nem kell fizetni: a díj a hirdetés jóváhagyása után kerül a rendelésbe. A régi 36 €-os videó extra megmaradt (jelentése átfed).

Ugyanez a választás ott van a hirdetésszerkesztőben is, a meghívással érkező tulajdonosnak.

Megnézni: [http://localhost:4321/hu/hirdetes-feladasa/](http://localhost:4321/hu/hirdetes-feladasa/) és [http://localhost:4321/nl/advertentie-plaatsen/](http://localhost:4321/nl/advertentie-plaatsen/). **Ne nyomd meg a küldést.** Az árlista: [http://localhost:4321/hu/arlista/](http://localhost:4321/hu/arlista/). A fotóútmutató: [http://localhost:4321/hu/fotozasi-utmutato/](http://localhost:4321/hu/fotozasi-utmutato/).

Admin: bejelentkezés után **Helyszíni szolgáltatások** a menüben (`/portal/services`).

### Hirdetésminőség

Az elbíráláson van egy magyar ellenőrzőlista (fotók + adatok). A pipák a tulajdonos nyelvén előre megírják a javításkérést. Álló és kis felbontású képnél figyelmeztetés van, automatikus elutasítás nincs. Javasolt minimum: **5 kép** — ezt Gábornak meg kell erősítenie.

Megnézni: portál → egy elbírálásra váró hirdetés (`/portal/review/…`).

### Visszatérítési szöveg helye

A Beállítások → Szolgáltatások oldalon van HU/NL mező. **Üresen sehol nem látszik.** Ha kitöltik, megjelenik a feladáson, az árlistán, fizetés előtt és a visszatérítést igénylő elutasító levélben. Szabályt mi nem publikáltunk.

### Értékmeghatározás 2.0

Öt lépés: Ingatlan → Épület és műszaki állapot → Környezet → Extrák és korlátok → Fotók és elérhetőség.

Kötelező csak a típus, a település, az alapterület, a név, az e-mail és az adatkezelési hozzájárulás. Minden zárt kérdésnél van „Nem tudom”. A települést a KSH listájából lehet keresni. A környezet kérdései csak területhasználatról és épületekről szólnak, soha nem az ott lakókról.

Három kérésfajta:

1. **Tájékoztató, piaci alapú** — soha nem „szakértői” vagy „hivatalos”
2. **Gábor helyszíni látogatása, 200 €** — ugyanaz a tétel, mint a hirdetésnél
3. **Igazságügyi / hivatalos** — árajánlat alapján, ár és határidő nélkül

A számolás sorrendje: legalább 8 hasonló FODEL-hirdetés; ha nincs, KSH 2024-es települési (vagy jelzett vármegyei) Ft/m²; telek, agrár, üzleti, ipari esetén nincs gépi szám. Nincs automatikus szorzó. Forráslink: KSH Ingatlanadattár. Holland oldalon euró csak akkor, ha Gábor dátummal megadott EUR/HUF árfolyamot.

Az **azonnali megjelenítés ki van kapcsolva.** Ma a tulajdonos ezt látja: munkatársunk ellenőrzi, és e-mailben küldi.

Megnézni: [http://localhost:4321/hu/ertekbecsles/](http://localhost:4321/hu/ertekbecsles/) és [http://localhost:4321/nl/waardebepaling/](http://localhost:4321/nl/waardebepaling/). Lépkedj végig a varázslón. **Ne küldd el.**

Admin: **Értékbecslések** a menüben, kéréstípus szerint szűrhető.

---

## 2. A 0015-ös migráció és a telepítés

Fájl: `supabase/migrations/0015_brief3.sql`. **Egy lépés**, a már éles 0014 után. Supabase → SQL Editor → az egész fájl → Run. Kétszer is futtatható, semmit nem ront el, és nem írja felül, amit admin már átírt.

Mit csinál:

1. Az elsődleges e-mailt `info@fodel.eu`-ra állítja, **csak ha még `info@fodel.nl`**
2. Beírja a WhatsApp-számot, **csak ha a mező üres**
3. Berakja a magyar tulajdonosi meghívót jóváhagyva, **csak ha még nincs ilyen sor**
4. Új mező a hirdetésen: mit kért a tulajdonos a feladáskor (csomag, extra, helyszíni szolgáltatás)
5. Új tábla a helyszíni kéréseknek, jogosultságokkal: admin mindent lát; a tulajdonos a sajátját; idegen vagy már nem szerkeszthető hirdetésre nem kérhet
6. Új mezők az értékbecslésen (szobák, állapot, fűtés, energetika, extrák, helyrajzi számok, privát cím, tényezők, kéréstípus, KSH-kód, HUF sáv, adatalap)
7. Új extrák a szótárban: garázs, medence, erkély, fedett beálló, tároló, csarnok, állattartásra alkalmas épület, szaletli, kerti sütőde

A kód a 0015 nélkül is kinyitja az oldalakat: a mentés a régi mezőkre esik vissza, a becslés emberi ellenőrzésre megy.

### Üzemeltetés, élesítés előtt (Richárd / Gábor)

1. **Előbb** hozd létre és próbáld ki az `info@fodel.eu` és `gabor@fodel.eu` postafiókot. A lábléc a 0015 után az új címet mutatja. Az `eladod.com` domain és a MX maradjon, a `fodel@eladod.com` miatt.
2. Vercel: `fodel.eu` legyen az elsődleges domain, `www.fodel.eu` irányítson rá. A `fodel.nl` / `fodel.hu` / `eladod.com` 301-es átirányítása csak akkor kerüljön a `vercel.json` fájlba, ha ezek a domainek tényleg ehhez a Vercel-projekthez tartoznak. Most ezért nincs benne.
3. Resend: igazold a `fodel.eu` domaint (SPF/DKIM). Állítsd be: `FODEL_FROM`, `FODEL_INBOX`, `FODEL_REPLY_TO`. Kell a `RESEND_API_KEY`.
4. Stripe webhook: `https://fodel.eu/api/stripe/webhook` (`checkout.session.completed`, `checkout.session.expired`).
5. Supabase Auth: Site URL és redirect URL-ek a `fodel.eu` címre. A 0015 futtatása ezután, kézzel.
6. Search Console: új property, új sitemap.
7. Ezután egy valós meghívó-, levél- és fizetési próba.

### Környezeti változók

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (csak szerveren), `RESEND_API_KEY`, `FODEL_INBOX`, `FODEL_FROM`, `FODEL_REPLY_TO`, `PMTILES_URL`, `STRIPE_ENABLED`, `PAYMENT_GATES_PUBLISHING`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AI_ENABLED`, `OPENAI_API_KEY`.

Példa a `.env.example` fájlban: `FODEL_INBOX=info@fodel.eu`.

Az Astro `allowedDomains` a `fodel.eu` és `www.fodel.eu` címeket engedi. A képek `remotePatterns` beállítása a Supabase tár maradt — a nyilvános oldalon onnan jönnek a képek.

---

## 3. Mit ellenőriztünk

| Ellenőrzés | Eredmény |
|---|---|
| `npx astro check` | 0 hiba, 0 figyelmeztetés |
| `npm run build` | sikeres (helyi Node 26, Vercel Node 22) |
| `verify-ssg --allow-missing-kvk` | 0 hiba; 2 figyelmeztetés: a francia belépőoldal hreflang nélkül, hiányzó KvK |
| `verify:contrast` | 0 kontraszthiba |
| PGlite, 0015 kétszer | sikeres; a magok nem írnak felül adminmódosítást; a helyszíni kérések RLS-e rendben |
| KSH-próba | pécsi családiház-adat megvan; vármegyei helyettesítés megvan; telekre nincs gépi szám |
| Build kanonikus / hreflang / OG / sitemap / robots / llms | nincs bent `https://fodel.nl` eredet |
| GET a localhoston | a briefben kért oldalak a várt 200/404 választ adják; a portál belépés nélkül a loginra visz |
| Levélminták `/dev/emails` | HU/NL 200; az adminmeghívó a jóváhagyott tulajdonosi levél mellett is adminszöveget mutat |
| Képernyő 375–1600 px | a varázsló öt lépése, feladás, árlista, fotóútmutató: nincs vízszintes túlcsordulás |

**Most, 0015 nélkül, éles írás nélkül nem látszik:** a WhatsApp-gomb a számmal, a lábléc új címe, egy elküldött értékbecslés mentése, helyszíni kérés mentése, és a belépett portál szerkesztő/elbírálás képernyője. A dev szerver az éles bázishoz csatlakozik, ezért nyilvános űrlapot nem küldtünk.

A 0015 után a nyilvános oldalak egy perc alatt frissülhetnek (rövid beállítás-gyorsítótár). Ha a WhatsApp vagy a cím nem jelenik meg azonnal, várj egy percet, vagy indítsd újra a `npm run dev -- --port 4321` parancsot.

---

## 4. Ki mit ad még

**Gábor.** Nézze végig a KSH/FODEL módszert valós ügyeken. Adja meg a KSH-sáv százalékát, a minimális adatszámot, és egy dátummal jelölt EUR/HUF árfolyamot, mielőtt az azonnali megjelenítés szóba jöhet. Erősítse meg az öt képes javaslatot. Adja meg a KvK-számot.

**Éva és Gábor.** Fogadják el vagy módosítsák a visszatérítési szabályt, a HU meghívó tárgyát és gombját, és írják meg a NL/EN/DE leveleket. Döntsenek: a 150/200 € bruttó-e, melyik térségben jár Gábor, van-e útiköltség, a helyszíni szolgáltatás mikor fizetendő, ki csinál igazságügyi becslést, Évának legyen-e saját belépése (`eva@fodel.eu`).

**Marci.** A fordítási szótár és a későbbi százalékos szemponttábla. Migráció után az árfolyam- és instant-küszöb beállítások próbája.

**Richárd.** Postafiókok, DNS/Vercel, Resend, Stripe, Supabase Auth, Search Console, eladod.com MX, éles 0015, utána egy integrációs próba.

---

## 5. Ami ki van kapcsolva, és miért

| Funkció | Miért |
|---|---|
| Azonnali becslés a képernyőn | Gábornak valós ügyeken kell igazolnia a módszert; sáv% és minimális adatszám nélkül a kapcsoló nem kapcsolható be |
| Százalékos értékmódosítás | Nincs igazolt modell. A szempontok csak szövegesen jelennek meg. A tábla üres, a kapcsoló zárolt |
| Helyszíni szolgáltatás előlege | A brief 2 szabálya: jóváhagyás előtt nincs díj. A kérés a rendelésbe a jóváhagyáskor kerül |
| Visszatérítési szöveg | Üres, amíg Gábor és Éva el nem dönti a szabályt |
| NL / EN / DE jóváhagyott meghívó | Nincs kliensszöveg; automatikus fordítást nem tettünk jóváhagyott sablonba |

---

## 6. A kódban meghozott döntések

- A cég e-mailje a kódban `info@fodel.eu` (korábban `info@fodel.hu` / `info@fodel.nl`). A Rólunk oldal idézetein a `fodel.eu` látszik.
- `MIN_PHOTOS = 5` javaslat, megerősítendő.
- A `allowedDomains` kapta a `fodel.eu` hostokat; a képek `remotePatterns` a Supabase maradt.
- A kliens „szanetri” szava **szaletli**ként került a szótárba.

---

## 7. Főoldal — megerősítés

**A főoldalt nem terveztük át.** Nem nyúltunk a herohoz, a TOP 10-hez, a cikksávhoz, a szekciók sorrendjéhez.

A főoldalon látható változás csak ez:

1. a lábléc / navigáció e-mailcíme a 0015 után `info@fodel.eu` (ha a magérték volt bent)
2. a WhatsApp-gomb megjelenik a 0015-ben megadott holland számmal

A `src/pages/index.astro` fájlban a változás a kanonikus és hreflang hivatkozásra korlátozódik.

---

## 8. Nyitott kérdések Gábornak és Évának

1. A 200 €-os látogatás tartalmaz-e drónfelvételt? A 150 €-os igen.
2. A 150 / 200 € bruttó ár? Mely térségekben jár Gábor, és van-e útiköltség?
3. A helyszíni szolgáltatást előre kell fizetni, vagy a hirdetés jóváhagyásakor?
4. Mely fizetős esetekben, mekkora összegben és milyen határidővel jár visszatérítés?
5. Ki végzi az igazságügyi értékbecslést, és mit ígérünk az ügyfélnek?
6. Az azonnali becslés automatikusan jelenjen-e meg, és ki validálja a módszert?
7. Évának legyen-e saját belépése a megosztott `info@` mellett, hogy az aktivitásnaplóban látszódjon, ki mit csinált?
8. Mi legyen a `fodel.nl`, `fodel.hu`, `info@fodel.nl`, `info@fodel.hu` és `info@ingatlan.nl` címekkel — átirányítás, megtartás vagy kivonás?
9. Jó a javasolt HU meghívótárgy és gomb? Ki írja és hagyja jóvá a többi nyelvet?
10. A „szanetri” tényleg szaletli?

**Csak vitaindító, sehol nem közzétett visszatérítési javaslat.** Ha a FODEL saját döntéséből nem teszi közzé a már kifizetett hirdetést, a teljes hirdetési díj visszajárhat. A tulajdonos visszavonása és a már megjelent hirdetés külön szabályt igényel. Összeget, határidőt és jogi szöveget Éva, Gábor és a jogi tanácsadó hagyja jóvá. A beállítás ma üres.
