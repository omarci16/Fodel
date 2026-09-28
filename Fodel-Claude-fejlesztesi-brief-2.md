# Födel – fejlesztési brief Claude számára

Dátum: 2026. szeptember 28.
Verzió: 2 – főoldali funkciókkal bővítve, általános áttervezés nélkül.
Megrendelői egyeztetés: Gábor, Éva és Bánki Richárd.
Forrás: két megbeszélés-átirat és Richárd utólagos hatókör-meghatározása.

## 1. Feladat és kötelező határok

A meglévő Födel projektben valósítsd meg az alábbi módosításokat. Először vizsgáld meg a kódot, az adatmodellt és a már működő funkciókat; ne építs párhuzamos rendszert. A dokumentum nem kódaudit: az átiratban említett állapot azóta változhatott.

**Frissített hatókör: a főoldali funkcionális módosítások is megvalósítandók. A főoldal általános egyszerűsítése, „letisztultabbá tétele” és újratervezése nem feladat.**

Ez a változat felülírja a korábbi brief főoldalt kizáró rendelkezéseit. Minden más feladat és a még hiányzó üzleti döntések kezelése érvényben marad.

- A főoldali TOP 10, a három legfrissebb blogcikk, az értékbecslési belépési pont és a WhatsApp-kapcsolat a feladat része; részletek az 1/A. fejezetben.
- A meglévő arculatot, tipográfiát, színvilágot és az érintetlen szekciókat őrizd meg. Csak a kért funkciókhoz szükséges helyi elrendezési változtatásokat végezd el.
- Közös komponens, navigáció vagy adatlekérdezés módosítható a kért funkciók bekötéséhez, de ne okozzon más felületen regressziót.
- Meglévő szekciót bővíts vagy javíts; ne duplikáld ugyanazt a funkciót új blokkal.

Elsődleges cél: az ingatlanállomány egy helyen kezelhető legyen, a feltöltés, adminisztráció és emberi jóváhagyás működjön végig.

### A feladatok státuszának értelmezése

- **Megvalósítandó:** az egyeztetés alapján konkrét fejlesztési feladat.
- **Előkészítendő:** az alapok elkészíthetők, de hiányzó üzleti döntés, tartalom vagy hozzáférés nélkül ne aktiváld a teljes működést.
- **Későbbi ötlet:** rögzítsd a hátralévő feladatok között; ne kezeld véglegesen elfogadott specifikációként.

Az alábbi technikai részletek és elfogadási feltételek a megbeszélésből levezetett implementációs javaslatok. Nem állítjuk, hogy minden mező vagy státusz szó szerint elhangzott. Kövesd a meglévő projekt konvencióit; az üzleti logikát tartsd meg.

## 1/A. Főoldali funkciók – megvalósítandó

### Gábor TOP 10 ingatlana

- A Gábor által kézzel kiválasztott ingatlanok jelenjenek meg hangsúlyosan a főoldalon, a jelenlegi arculatba illesztve.
- Ez szerkesztői ajánlás, és különüljön el a fizetett kiemelésektől. Fizetés önmagában nem adhat TOP 10-helyet.
- Először ellenőrizd a már meglévő ajánlott/TOP 10 szekciót és az adminbeállításokat; azokat használd vagy bővítsd.
- Az adminban lehessen legfeljebb tíz ingatlant kiválasztani, sorrendbe rendezni és eltávolítani a válogatásból. Az adat mentődjön, a főoldal a mentett válogatást mutassa.
- Kizárólag jóváhagyott, publikált és aktuálisan elérhető ingatlan jelenhet meg. Archivált, eladott vagy visszavont tétel ne maradjon aktív ajánlatként a blokkban.
- Ha tíznél kevesebb megfelelő ingatlan van kiválasztva, csak a valódi tételeket mutasd; ne töltsd fel automatikusan fizetett vagy véletlenszerű hirdetésekkel. Üres válogatásnál ne legyen üres kártyarács vagy kitalált ajánlat.
- Az ingatlankártyák a megfelelő nyelvű részletes oldalra vezessenek, és mobilon is használhatók legyenek.
- Gábortól be kell kérni az induló válogatást és annak sorrendjét; ez nem akadálya az adminfunkció elkészítésének.

### Az aktuális nyelv három legfrissebb blogcikke

- A főoldalon az aktuális nyelv legutóbb publikált három blogbejegyzése jelenjen meg, publikálási idő szerint csökkenő sorrendben.
- Kártyánként borítókép, cím, rövid kivonat és a teljes cikkhez vezető link szerepeljen, a meglévő komponensek stílusával.
- Csak publikált és már elérhető nyelvi változatok kerülhetnek ide. Piszkozat, jövőre időzített cikk vagy hiányzó fordítás ne jelenjen meg.
- A szerkesztési idő ne emeljen automatikusan régi cikket a legfrissebbek elé.
- Ha kevesebb mint három cikk van az adott nyelven, csak az elérhetőket mutasd. Nulla cikk esetén a blokk maradjon rejtve; ne helyettesíts idegen nyelvű tartalommal.
- Legyen út a teljes bloglistához. Az esettanulmány külön tartalomtípus; ne keverd automatikusan a három blogbejegyzés közé.
- A publikálás és visszavonás frissítse a főoldali listát a projekt gyorsítótárazási szabályai szerint.

### Értékbecslési belépési pont

- A működő értékbecslés kapjon jól látható főoldali belépési pontot: a meglévő felépítéshez illeszkedő blokkot vagy meglévő blokkban hangsúlyos gombot.
- A gomb tényleges, végigvihető értékbecslési folyamatra vezessen, az aktuális nyelven. Ne mutass működőként félkész vagy nem bekötött szolgáltatást.
- A megjelenést kösd a szolgáltatás elérhetőségéhez; ha még nem működik, készítsd elő a komponenst, de ne aktiváld a forgalomterelő felhívást.
- A megbeszélésen ingyenes alapbecslés mint látogatószerző eszköz szerepelt. Az „ingyenes” állítást csak akkor használd, ha a tényleges induló szolgáltatás díjmentessége megerősített.
- Ne ígérj garantált pontosságot, azonnali eredményt vagy hivatalos szakvéleményt, ha a valós folyamat ezt nem biztosítja. Az adminellenőrzést és a becslési csomagok nyitott kérdéseit a 8. fejezet szerint kezeld.

### WhatsApp és navigáció

- A főoldalon is legyen látható WhatsApp-kapcsolatfelvételi gomb, a 9. fejezet konfigurálható telefonszámával.
- Használhatsz közös publikus oldali komponenst, de ne jelenjen meg többször ugyanaz a lebegő gomb, és mobilon ne takarja a fő műveleteket vagy a sütibeállítási felületet.
- A kapcsolódó aloldalakhoz szükséges navigációs linkeket kösd be a meglévő rendszerbe. Ne végezz általános menü-átszervezést vagy arculati áttervezést.
- Minden új főoldali szöveg és céloldallink az aktuális nyelvhez igazodjon; ne legyen magyar–idegen nyelvű keveredés.

Elfogadás: a TOP 10 az adminban kezelt szerkesztői válogatást mutatja; a blogsáv nyelvenként a három legfrissebb publikált cikket hozza; az értékbecslési gomb csak elérhető szolgáltatásra vezet; a WhatsApp a valós számot nyitja meg; a főoldal általános megjelenése nem lett áttervezve.

## 2. Adminfelület és hozzáférés – megvalósítandó

- Magyarítsd az admin összes felhasználói feliratát: menük, gombok, állapotok, szűrők, aktivitásnapló eseményei, üres állapotok, visszajelzések és hibaüzenetek.
- Technikai adatbázis-kulcsot, API-értéket vagy változónevet nem kell magyarítani.
- Legyen külön „Vissza a főoldalra” gomb; ez navigáció, ne jelentkeztesse ki a felhasználót.
- A kijelentkezés továbbra is szüntesse meg a munkamenetet.
- Készítsd elő Gábor és Éva adminhozzáférését a meglévő jogosultsági rendszerrel. A célcímek bekéréséig ne találj ki felhasználói adatokat vagy jelszavakat.
- Implementációs javaslat: személyenként külön belépés, hogy az aktivitásnaplóban azonosítható legyen a művelet végrehajtója; a közös e-mail-postafiók ettől külön kérdés.
- Az érdeklődők menüpont további finomítása elhangzott, de nincs részletes specifikáció. Javítsd az egyértelmű működési/fordítási hibákat; új CRM-folyamatot ne találj ki.

Elfogadás: nincs indokolatlan angol kezelőfelületi szöveg; a jogosulatlan felhasználó nem fér hozzá az adminadatokhoz; a főoldalra visszatérés és a kijelentkezés külön működik.

## 3. Fizetések és Excel-export – megvalósítandó

- A meglévő fizetési mód mellett látszódjon pontosan a fizetés tárgya: szolgáltatás/csomag, kapcsolódó hirdetés vagy megrendelés.
- A meglévő adatokból jelenítsd meg az összeget, pénznemet, időpontot, ügyfelet és fizetési állapotot.
- Készíts áttekinthető pénzügyi listát és valódi, strukturált .xlsx-exportot. Ne nevezz át CSV-fájlt .xlsx-re.
- Az export kövesse az aktív szűrést, és tartalmazza az összes szűrt rekordot, ne csak az aktuális lapozási oldalt.
- Eltérő pénznemeket ne összegezz átváltási szabály nélkül; a sikeres, függő és visszatérített tételeket ne mosd össze.
- Régi rekordok hiányzó szolgáltatásadata helyett ne találj ki megnevezést; jelezd a hiányt.
- Az export is adminjogosultsághoz kötött legyen.

Elfogadás: egy konkrét fizetésről megállapítható, mihez tartozik; az export megnyitható, magyar fejlécekkel és helyes összegekkel dolgozik.

## 4. Felhasználói adatbázis és félbehagyott regisztrációk

### Megvalósítandó

- Külön fül: „Regisztrált felhasználók” és „Félbehagyott regisztrációk”.
- A két listát valós regisztrációs állapot alapján válaszd szét; ne a hirdetések száma alapján.
- A félbehagyott folyamat mentését az elfogadott adatkezelési folyamathoz kösd. Ne gyűjts észrevétlenül puszta gépelésből e-mail-címeket.
- Kezeld a duplikációkat, és a sikeres regisztráció után vezesd át a rekordot a megfelelő állapotba.
- Az aktivitásnapló valós eseményeket jelenítsen meg, magyar megnevezéssel. Személyes adatok ne váljanak nyilvánossá.

### Előkészítendő

- Automatikus emlékeztető e-mail a félbehagyott regisztráció után.
- A küldés előtt szükséges a végleges adatkezelési szöveg/folyamat, levélszöveg, időzítés és feladói beállítás.
- Az általános adatkezelési elfogadást ne tekintsd automatikusan marketinghozzájárulásnak.
- A küldés legyen ismétlésbiztos; a regisztráció befejezése törölje a függő emlékeztetőt.
- Az automatizmus alaphelyzetben kikapcsolt maradjon a hiányzó döntésekig.

## 5. Blog és esettanulmányok – megvalósítandó

### Tárolás és szerkesztés

- Ellenőrizd és szükség esetén kösd be a valódi adatmentést a projekt meglévő Supabase-adattárolásába.
- Lehessen cikket létrehozni, menteni, később visszanyitni és módosítani.
- Legyen piszkozat és publikált állapot; a piszkozat közvetlen linken/API-n keresztül se legyen nyilvános.
- Mezők: cím, kivonat/bevezető, tartalom, borítókép, kategória, nyelv, publikálási állapot, egyedi URL a meglévő megoldáshoz igazítva.
- A szerkesztő támogasson képeket és linkeket, a kategóriák legyenek bővíthetők.
- A publikus bloglista és cikkaloldal működjön mobilon is. Kösd be a főoldali háromcikkes blogsávot az 1/A. fejezet szerint.

### Nyelvek

- Támogatandó: magyar (hu), holland (nl), angol (en), német (de).
- Egy cikknek ne legyen kötelező minden nyelven megjelennie: eltérő célpiacoknak eltérő tartalom készülhet.
- Legyen nyelvenkénti kezelés és gyors kijelölés: „Összes nyelv”, „Összes külföldi nyelv” (nl/en/de).
- A kijelölés önmagában nem fordítás. Ne publikálj magyar tartalmat idegen nyelvű cikként.
- A nyelvi változatok legyenek összekapcsolhatók, de külön szerkeszthetők és publikálhatók. Hiányzó fordítás ne jelenjen meg kész tartalomként.
- Ha már van működő fordítási integráció, használd a projekt szabályai szerint; az új fordítás legyen ellenőrizhető piszkozat. Ellenkező esetben a kézi változatkezelést valósítsd meg, és a fordítási integrációt jelöld nyitott feladatként.
- Ellenőrizd a cikkek saját URL-jét és megosztási metaadatait. Ne ígérj Google- vagy AI-találati helyezést.

### Esettanulmányok

- A meglévő tartalomkezelés kibővítésével legyen „Esettanulmány” tartalomtípus, saját listázási/szűrési lehetőséggel és részletes oldallal.
- Ugyanazt a nyelvi és publikációs rendszert használja, mint a blog.
- Legyen hely források, módszertan és eredmények feltüntetésére a tartalomban; ne gyárts fiktív kutatásokat vagy eredményeket.
- Külső szerzők bevonása tartalmi/üzleti feladat, nem fejlesztési függőség. A példaként említett szerzői díj nem végleges ár.

Elfogadás: a mentett piszkozat újratöltés után megmarad; csak a publikált nyelvi változat látható; nincs nyelvkeveredés; a főoldali cikklista az 1/A. fejezet szerint frissül.

## 6. Fordítási szótár – előkészítendő

- Vizsgáld meg a már létező szótármenüpontot, és rögzítsd, hogy valóban be van-e kötve a fordításba.
- Cél: ingatlanszakmai kifejezések és helyi szóhasználat egységes kezelése nyelvenként.
- Ne jeleníts meg működőként olyan szabályt, amelyet a fordítás nem vesz figyelembe.
- Marcival tisztázandó a jelenlegi implementáció és a kívánt logika. Ne írj át emiatt globálisan minden fordítást.

## 7. Meghívók és ingatlanfeltöltés – megvalósítandó

- Admin küldhessen egyedi meghívót a tulajdonosnak önálló ingatlanfeltöltésre.
- Az admin által adott ingyenes feltöltési lehetőség szerveroldali jogosultság legyen; ne lehessen egy URL-paraméter átírásával megszerezni.
- A meghívó nyelve legyen kézzel választható: hu/nl/en/de. A kézi választás mindig írja felül az automatikus javaslatot.
- Automatikus nyelvjavaslathoz csak ismert felhasználói nyelv vagy más ténylegesen rendelkezésre álló preferencia használható. Egy e-mail-címből nem állapítható meg megbízhatóan a nyelv, és a meghívó admin IP-címe nem a címzetté.
- Készíts szerkeszthető/lokalizált meghívósablonokat; a végleges szöveget Gábor és Éva adja. Tesztszöveg ne menjen éles ügyfélnek.
- A meghívó kapcsolódjon a címzetthez és az engedélyezett feltöltési lehetőséghez; kezelje a hibás, lejárt vagy már felhasznált linket a meglévő authrendszer szerint.

### Képek és minőség

- A feltöltés helyén röviden írd le a technikai korlátokat: támogatott formátum, méret és felbontás a tényleges rendszerbeállítás alapján.
- Adj tartalmi útmutatót is: világos, éles, az ingatlant jól bemutató képek; az ügyfél számára legyen érthető, miért fontos a minőség.
- A technikai validáció szerveroldalon is történjen meg. Az esztétikai minőséget ne állítsd automatikusan garantáltnak.
- A gépi felolvasás csak felmerült ötlet: nem szükséges az első körben.

### Moderáció

- Fizetős és ingyenes hirdetés egyaránt emberi jóváhagyás után publikálható.
- A sikeres fizetés, ingyenes meghívó vagy ismételt feltöltés se kerülje meg ezt.
- Javasolt, a meglévő modellel összehangolandó állapotok: piszkozat, ellenőrzésre vár, javítás szükséges, jóváhagyott/publikált, elutasított.
- Az admin adhasson javítási indokot; a tulajdonos tudja pótolni a képeket és újra beküldeni a hirdetést.
- A visszatérítés szükségessége rögzíthető legyen elutasításkor, de automatikus pénzvisszafizetést ne indíts végleges szabály és meglévő fizetési integráció nélkül.
- A beszélgetésben említett 30 euró nem új, elfogadott csomagár.

### Későbbi meghívási automatizálás alapjai

- Külön beállításként készítsd elő a felhasználói meghívás/engedélyezés automatizálhatóságát.
- Alapértelmezés: kézi működés; automatikus feltételek hiányában ne engedélyezd az aktiválást.
- A kapcsoló kizárólag a meghívási/engedélyezési folyamatra vonatkozhat. A hirdetés végleges emberi jóváhagyását nem kapcsolhatja ki.

Elfogadás: ingyenes meghívóval végigvihető a feltöltés; a hirdetés csak adminjóváhagyás után publikus; a javítás és újrabeküldés működik; a levél a kiválasztott nyelven készül.

## 8. Értékbecslés – alapfolyamat megvalósítandó, szakmai modell előkészítendő

### Most megvalósítható

- A meglévő értékbecslési felület kezelje a beküldött ingatlanadatokat és képeket, az ellenőrzési állapotot és az adminjóváhagyást.
- A már létező ingatlanmezőket használd újra, ne legyen két eltérő jelentésű adatmodell ugyanarra az adatra.
- Az eredmény a megbeszélt folyamatban ellenőrzés után legyen kiadható. A rendszer ne küldjön ki ellenőrizetlen AI-eredményt automatikusan.
- Javasolt állapotok: beküldve, ellenőrzés alatt, hiánypótlás szükséges, jóváhagyva/kiadva.
- A kérdéssor bővíthető legyen; az opcionális kérdéseknél legyen „nem tudom” lehetőség. Ne minősítsd azt negatív válasznak.
- Készíts helyet az adatpontosságról és a becslés jellegéről szóló, jóváhagyandó tájékoztatásnak.

### Gáborral véglegesítendő szakmai mezők

- Telek- és épületméret, építés éve, állapot és az ingatlanfeltöltés további releváns adatai.
- Út és megközelíthetőség, burkolat, közúthoz való viszony, zajterhelés.
- Internetelérés, panoráma, erdő, tó, patak és vízpart közelsége vagy érintettsége.
- Mezőgazdasági üzem/állattartó telep közelsége, tényszerű környezeti és szaghatások.
- Magasfeszültségű vezeték jelenléte és távolsága; az 500 méter az egyeztetés példája, nem önmagában szakmailag validált küszöb.
- A tervezett felhasználás szerinti értelmezés: ugyanaz a körülmény különböző ingatlantípusoknál eltérő hatású lehet.

Ne találj ki szorzókat, értékbecslési pontosságot vagy szakértőinek feltüntetett számítási modellt. A több kitöltött mező önmagában nem bizonyít nagyobb pontosságot. Etnikai hovatartozást vagy más védett tulajdonságot ne kérj be és ne használj értékmódosító tényezőként; maradj az objektív ingatlan- és környezeti adatoknál.

### Nem végleges szolgáltatási ötletek

Felmerült alapbecslés, részletes AI-becslés, telefonos konzultáció és partner által végzett hivatalos értékbecslés. A megbeszélésen a négyfelé bontás ellen is szóltak.

- Ne hozz létre automatikusan négy éles csomagot.
- A 10/50 kérdés és az említett 10 euró/5000 forint példák, nem végleges specifikációk.
- A szakértői partner, jutalék, ár, eredményformátum és teljesítési folyamat további döntést igényel.
- A hivatalos értékbecslést ne mosd össze az AI-becsléssel vagy telefonos tájékoztatással.
- A főoldali értékbecslési belépési pont is feladat az 1/A. fejezetben leírt elérhetőségi feltételekkel.

## 9. WhatsApp és e-mail

### WhatsApp – megvalósítandó, telefonszám szükséges

- Legyen WhatsApp-kapcsolatfelvételi lehetőség a főoldalon és a releváns kapcsolat- és ingatlanaloldalakon.
- A célszám konfigurálható legyen; telefonszámot ne találj ki.
- Ingatlanaloldalról opcionálisan előre kitöltött üzenetbe kerülhet a hirdetés címe/linkje, felhasználói elküldéssel.
- Ez kapcsolatfelvételi gomb, nem automatikus WhatsApp-értesítési rendszer. Az utóbbihoz külön szolgáltatás és döntés kellene.
- A főoldali WhatsApp-megjelenést az 1/A. fejezet szerint valósítsd meg; hiányzó célszám esetén ne jelenjen meg hibás vagy tesztszámra mutató gomb.

### E-mail-struktúra – előkészítendő

- Nyitott döntés: közös cím vagy közös és személyes címek együtt; esetleges későbbi partnercímek és jogosultságok.
- A feladói és válaszcímek legyenek konfigurálhatók, ne legyenek szétszórtan beégetve.
- A régi e-mail-címnek működnie kell tovább; átirányítás/átállás csak a pontos címek és szolgáltatói hozzáférés birtokában tervezhető.
- A tényleges domainírást és címeket ellenőrizni kell; az átiratban szereplő példákat ne kezeld hiteles technikai adatként.
- A tárhelyszolgáltató megnevezése az átiratban bizonytalan. Ne módosíts DNS-t vagy levelezést feltételezések alapján.
- Külső partner csak a neki szánt ügyekhez férhessen hozzá, ne a teljes ügyféladatbázishoz vagy közös postafiókhoz.

## 10. Ingatlantábla és Facebook

### Födel „Eladó” tábla – későbbi ötlet / előkészítendő

Pozitívan fogadott ötlet, hogy a hirdető márkázott táblát rendelhet. Rögzítsd a feladatlistán, és a megrendelési modell bővíthetőségével számolj, de ne indíts éles értékesítést végleges ár és teljesítési feltételek nélkül.

Hiányzik: tábla mérete, anyaga, grafikája, beszállító, tényleges gyártási és szállítási ár, célországok, fizetés és teljesítés felelőse. Az 1500 Ft körüli összeg csak példa volt. Nem szükséges külön webshopmotor.

### Facebook – jelenleg nem megvalósítandó

A csoportos megosztás, csoportajánló és hirdetés utáni csoportlinkes levél felmerült, de a beszélgetés végén elengedték. Ne építs ilyen automatizmust vagy levelet. A meglévő megosztási funkciókat emiatt ne töröld.

## 11. Bekérendő adatok és döntések

| Kitől | Mire van szükség | Melyik feladatot érinti |
|---|---|---|
| Gábor és Éva | Adminbelépéshez használni kívánt e-mail-címek | Hozzáférések |
| Gábor és Éva | Egy közös vagy több céges cím; pontos domain, feladói és válaszcímek; hozzáférési rend | Levelezés |
| Gábor és Éva | Régi e-mail-cím, szolgáltató és biztonságosan átadott hozzáférés/meghívás | Régi levelezés megtartása |
| Gábor és Éva | WhatsApp-szám nemzetközi formátumban | Kapcsolatfelvételi gomb |
| Gábor és Éva | Meghívólevelek végleges szövege, idegen nyelvi ellenőrzés felelőse | Meghívók |
| Gábor és Éva | Félbehagyott regisztráció megkeresésének szövege, időzítése és adatkezelési folyamata | Emlékeztető |
| Gábor | Az induló TOP 10 ingatlanok azonosítói/linkjei és sorrendje | Főoldali válogatás |
| Gábor | Értékbecslési kérdések, kötelező mezők, szempontok és szakmai számítási szabályok | Részletes becslés |
| Gábor és Éva | Induló becslési szolgáltatások, árak, szakértő, eredmény és jóváhagyási felelős | Csomagok |
| Gábor és Éva | Képi követelmények, javítás/elutasítás és visszatérítés végleges szabálya | Moderáció |
| Gábor és Éva | Első cikkek, képek, célközönség/nyelvek, régi oldal aktualizált szövegei | Tartalomfeltöltés |
| Marci / projektgazda | Szótár meglévő működésének tisztázása | Fordítási szótár |
| Gábor és Éva | Táblarendelés termék- és teljesítési adatai | Későbbi kiegészítő szolgáltatás |

A hiányzó tartalmak ne blokkolják az önállóan elvégezhető fejlesztéseket. Külön jelezd, melyik funkció működik, melyik van előkészítve és melyik vár döntésre.

## 12. Végrehajtási sorrend és ellenőrzés

1. Kódfelmérés; meglévő auth, ingatlan-, fizetési-, tartalom- és fordítási modell azonosítása. A főoldal jelenlegi állapotának rögzítése a regresszió ellenőrzéséhez.
2. Admin magyarítása, navigáció, hozzáférés előkészítése; meghívás, feltöltés és emberi moderáció működő lánca.
3. Fizetési részletek és Excel-export; felhasználói adatbázis szétválasztása.
4. Blog valódi mentése, nyelvi változatok, publikálás és esettanulmányok.
5. Főoldali TOP 10 és nyelvenkénti háromcikkes blogsáv; WhatsApp a főoldalon és az aloldalakon; konfigurálható levelezési alapok; emlékeztető és meghívási automatizmus kikapcsolt előkészítése.
6. Értékbecslési adminfolyamat és bővíthető űrlap, működőképesség esetén főoldali belépési pont; a szakmai modell, csomagok, szótár és táblarendelés hiányzó döntéseinek dokumentálása.

### Célzott ellenőrzések

- Projekt meglévő build/typecheck/lint ellenőrzései a releváns változásokra.
- Adminjogosultság, nem nyilvános piszkozatok és személyes adatok hozzáférése.
- Ingyenes és fizetős feltöltés sem kerülheti meg az emberi publikálási jóváhagyást.
- Meghívó nyelve és jogosultsága; javítás utáni újrabeküldés.
- Tartalommentés, újratöltés és nyelvenkénti publikálás.
- Excel-export pontossága, lapozáson túli rekordjai és pénznemei.
- Ha emlékeztető implementálva van: nincs dupla küldés és befejezett regisztrációnál nem küld.
- A módosított főoldali elemek és aloldalak mobilon is használhatók.
- A főoldal minden meglévő nyelvi változatán ellenőrizd a kért funkciókat: TOP 10 mentése/sorrendje és nem publikus tételek kizárása; három legfrissebb cikk és nyelvi szűrés; értékbecslési elérhetőség; WhatsApp. Az érintetlen szekciókban ne legyen regresszió vagy általános áttervezés.

### Átadáskor adj rövid jelentést

- Mi készült el és hol érhető el?
- Milyen adatbázis-migráció, konfiguráció vagy külső hozzáférés szükséges?
- Mit és milyen eredménnyel ellenőriztél?
- Mi vár Gáborra, Évára, Marcira vagy Richárdra?
- Melyik funkció maradt kikapcsolva, és miért?
- Sorold fel külön a főoldali funkcionális változtatásokat, és igazold, hogy általános egyszerűsítést vagy arculati áttervezést nem végeztél.

Ne nevezz késznek pusztán látványként működő, nem mentő vagy külső integráció nélkül maradt funkciót. A feladatot tényleges implementációként végezd el a rendelkezésre álló projektben, ne csak újabb tervet adj.
