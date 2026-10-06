/**
 * Dutch email copy.
 *
 * Type-checked against the Hungarian file below (`satisfies typeof HU`): if a
 * template is added to hu.ts and not translated here, this file stops
 * compiling. That is the point — a silent fallback to Hungarian for a Dutch
 * seller is exactly the failure this arrangement is meant to make impossible.
 */
import type { HU } from './hu';
import { SITE_HOST } from '~/config/site.mjs';

export const NL = {
  common: {
    greeting: (name: string) => `Beste ${name},`,
    greetingNoName: 'Geachte adverteerder,',
    signOff: 'Met vriendelijke groet,\nFODEL Vastgoed',
    questions: 'Heeft u een vraag? U kunt gewoon op deze e-mail antwoorden.',
    linkFallback: 'Werkt de knop niet? Kopieer dan dit adres naar uw browser:',
  },

  registrationConfirm: {
    subject: 'Bevestig uw advertentie — FODEL',
    preheader: 'Nog één stap: stel een wachtwoord in en ga verder met uw advertentie.',
    heading: 'Nog één stap',
    intro: (settlement: string) =>
      `Dank u wel dat u voor FODEL heeft gekozen${settlement ? ` voor uw woning in ${settlement}` : ''}. Wij hebben uw gegevens ontvangen.`,
    body: 'Klik op de knop hieronder om een wachtwoord in te stellen en direct verder te gaan met uw advertentie — de gegevens die u heeft ingevuld staan er al in.',
    cta: 'Verder met mijn advertentie',
    expiry: 'De link is 7 dagen geldig. Heeft u zelf geen advertentie aangevraagd? Dan kunt u deze e-mail negeren — er wordt geen account aangemaakt.',
  },

  invite: {
    subject: 'Uitnodiging voor het FODEL-portaal',
    preheader: 'Stel uw wachtwoord in en log in op het adverteerdersportaal.',
    heading: 'U bent uitgenodigd voor het FODEL-portaal',
    body: (role: string) =>
      `FODEL nodigt u uit om ${role} deel te nemen aan het portaal, waar u vastgoedadvertenties beheert.`,
    roleAdmin: 'als beheerder',
    roleOwner: 'als adverteerder',
    cta: 'Uitnodiging accepteren',
    expiry: 'De link is 7 dagen geldig en kan maar één keer worden gebruikt.',
  },

  welcome: {
    subject: 'Welkom bij het FODEL-portaal',
    preheader: 'Uw account is actief. Zo plaatst u uw eerste advertentie.',
    heading: (name: string) => `Welkom, ${name}`,
    body: 'Uw account is actief. In het portaal stelt u uw advertentie samen, uploadt u foto’s en volgt u de beoordeling.',
    stepsTitle: 'Wat u nodig heeft',
    steps: [
      'Foto’s van de woning — minimaal één, maar hoe meer hoe beter',
      'De basisgegevens: woonoppervlak, perceeloppervlak, vraagprijs',
      'Een paar zinnen over wat deze woning bijzonder maakt',
    ],
    cta: 'Naar het portaal',
  },

  submissionReceived: {
    subject: (ref: string) => `Wij hebben uw advertentie ontvangen — #${ref}`,
    preheader: 'Wij beoordelen hem en laten het u per e-mail weten.',
    heading: 'Uw advertentie is ontvangen',
    body: (title: string, ref: string) =>
      `Wij hebben uw advertentie „${title}” (#${ref}) ontvangen. Een medewerker beoordeelt hem en zodra er een besluit is, hoort u het per e-mail.`,
    timing: 'De beoordeling duurt doorgaans niet langer dan twee werkdagen.',
    note: 'Tijdens de beoordeling kunt u de advertentie niet bewerken. Vragen wij om een aanpassing, dan gaat hij direct weer open.',
  },

  adminNewSubmission: {
    subject: (ref: string) => `Wacht op beoordeling — #${ref}`,
    preheader: 'Er is een nieuwe advertentie binnengekomen.',
    heading: 'Nieuwe advertentie ter beoordeling',
    cta: 'Beoordeling openen',
    labels: {
      ref: 'Referentie',
      title: 'Titel',
      owner: 'Adverteerder',
      email: 'E-mail',
      location: 'Locatie',
      price: 'Vraagprijs',
      photos: 'Foto’s',
      languages: 'Talen',
    },
  },

  changesRequested: {
    subject: (ref: string) => `Aanpassing nodig — #${ref}`,
    preheader: 'Eén kleine aanpassing en de advertentie kan live.',
    heading: 'Wij vragen u om een aanpassing',
    body: (title: string, ref: string) =>
      `Over uw advertentie „${title}” (#${ref}) heeft onze medewerker de volgende opmerking:`,
    after: 'De advertentie is weer te bewerken. Voer de aanpassing door en dien hem opnieuw in — daarna loopt het proces gewoon verder.',
    cta: 'Advertentie aanpassen',
  },

  approvedAwaitingPayment: {
    subject: (ref: string) => `Goedgekeurd — #${ref} · alleen de betaling nog`,
    preheader: 'Uw advertentie is goedgekeurd en gaat live zodra de betaling binnen is.',
    heading: 'Uw advertentie is goedgekeurd',
    body: (title: string, ref: string) =>
      `Goed nieuws: wij hebben uw advertentie „${title}” (#${ref}) beoordeeld en goedgekeurd. Alleen de betaling is nog nodig — zodra die binnen is, staat de advertentie direct online.`,
    orderTitle: 'Kosten van de advertentie',
    discountLabel: 'Aanbrengkorting (10%)',
    totalLabel: 'Te betalen',
    ctaCard: 'Betalen met creditcard',
    cardNote: 'De betaling verloopt via de beveiligde omgeving van Stripe. FODEL ziet en bewaart uw kaartgegevens niet.',
    bankTitle: 'Of per bankoverschrijving',
    bankNote: (ref: string) =>
      `Vermeld bij de overschrijving het referentienummer: ${ref}. Zodra de overschrijving binnen is, zet onze medewerker de advertentie live.`,
    vatNote: 'Alle genoemde bedragen zijn inclusief 21% Nederlandse btw.',
  },

  approvedPublished: {
    subject: (ref: string) => `Goedgekeurd en online — #${ref}`,
    preheader: 'Uw advertentie staat al online; betaal de advertentiekosten binnen 14 dagen.',
    heading: 'Uw advertentie staat nu online',
    body: (title: string, ref: string) => `Wij hebben advertentie „${title}” (#${ref}) goedgekeurd en direct gepubliceerd.`,
    viewCta: 'Advertentie bekijken',
    orderTitle: 'Kosten van de advertentie',
    discountLabel: 'Aanbrengkorting (10%)',
    totalLabel: 'Te betalen',
    dueLabel: 'Uiterste betaaldatum',
    ctaCard: 'Betalen met creditcard',
    cardNote: 'De betaling verloopt via de beveiligde omgeving van Stripe. FODEL ziet en bewaart uw kaartgegevens niet.',
    bankTitle: 'Bankoverschrijving',
    bankNote: (ref: string) => `Vermeld bij de overschrijving het referentienummer: ${ref}.`,
    vatNote: 'Alle genoemde bedragen zijn inclusief 21% Nederlandse btw.',
  },

  paymentReceipt: {
    subject: (ref: string) => `Betalingsbevestiging — #${ref}`,
    preheader: 'Dank u wel, wij hebben uw betaling ontvangen.',
    heading: 'Dank u wel, uw betaling is ontvangen',
    body: (title: string, ref: string) =>
      `Wij hebben de betaling voor advertentie „${title}” (#${ref}) ontvangen. De advertentie staat online en is zichtbaar op ${SITE_HOST}.`,
    orderTitle: 'Specificatie',
    discountLabel: 'Aanbrengkorting (10%)',
    totalLabel: 'Betaald bedrag',
    vatNote: 'Het bedrag is inclusief 21% Nederlandse btw. De factuur ontvangt u in een aparte e-mail.',
    paidAtLabel: 'Betaaldatum',
  },

  published: {
    subject: (ref: string) => `Uw advertentie staat online — #${ref}`,
    preheader: `De advertentie is nu zichtbaar op ${SITE_HOST}.`,
    heading: 'Uw advertentie staat online',
    body: (title: string, ref: string) =>
      `Uw advertentie „${title}” (#${ref}) staat op ${SITE_HOST} en is bereikbaar voor kopers in acht landen.`,
    cta: 'Advertentie bekijken',
    next: 'Zodra iemand interesse toont, sturen wij u direct een e-mail met zijn gegevens. De status van uw advertentie ziet u altijd in het portaal.',
  },

  newEnquiry: {
    subject: (ref: string) => `Nieuwe geïnteresseerde — #${ref}`,
    preheader: 'Iemand heeft interesse in uw woning.',
    heading: 'Nieuwe reactie op uw advertentie',
    body: (title: string, ref: string) =>
      `Op uw advertentie „${title}” (#${ref}) heeft iemand gereageerd:`,
    labels: { name: 'Naam', email: 'E-mail', phone: 'Telefoon' },
    messageTitle: 'Zijn bericht',
    advice: 'Neem bij voorkeur binnen twee dagen contact op — snel reageren is veruit de belangrijkste factor of het tot een verkoop komt.',
  },

  passwordReset: {
    subject: 'Wachtwoord herstellen — FODEL-portaal',
    preheader: 'De link is één uur geldig.',
    heading: 'Wachtwoord herstellen',
    body: 'Wij ontvingen een verzoek om het wachtwoord van uw FODEL-portaalaccount te herstellen. Klik op de knop hieronder om een nieuw wachtwoord in te stellen.',
    cta: 'Nieuw wachtwoord instellen',
    expiry: 'De link is één uur geldig en kan maar één keer worden gebruikt.',
    ignore: 'Heeft u dit niet zelf aangevraagd? Negeer deze e-mail — uw wachtwoord blijft ongewijzigd en er gebeurt niets.',
  },

  referralRegistered: {
    subject: 'Uw aanbeveling is ontvangen — FODEL',
    preheader: 'Onze medewerker neemt binnenkort contact op met de door u aanbevolen persoon.',
    heading: 'Dank u voor de aanbeveling',
    body: (referredName: string) =>
      `Wij hebben de gegevens van ${referredName} ontvangen. Onze medewerker neemt contact op, en zodra de advertentie tot stand komt, schrijven wij 10% korting bij op de kosten van uw volgende advertentie.`,
    note: 'De bijschrijving gebeurt handmatig, na betaling door de adverteerder — onze medewerker laat het u weten zodra dat kan.',
  },

  valuationReady: {
    subject: 'Uw waardebepaling is gereed — FODEL',
    preheader: 'Wij hebben een indicatieve schatting voor uw woning gemaakt.',
    heading: 'Uw waardebepaling is gereed',
    body: (range: string) =>
      `Op basis van de opgegeven gegevens en vergelijkbare woningen is onze indicatieve schatting: ${range}.`,
    disclaimerWithCount: (n: number) =>
      `Deze schatting is indicatief, geen taxatierapport, en vervangt geen officiële taxatie. Gebaseerd op ${n} vergelijkbare woningen.`,
    /** When an admin priced it by hand — there is no comparable count to cite. */
    disclaimer:
      'Deze schatting is indicatief, geen taxatierapport, en vervangt geen officiële taxatie.',
    cta: 'Nu adverteren',
    ctaUrl: 'submitAd',
  },

  valuationDeclined: {
    subject: 'Uw aanvraag voor een waardebepaling — FODEL',
    preheader: 'Onze medewerker neemt persoonlijk contact met u op.',
    heading: 'Dank u voor uw aanvraag',
    body: 'Op basis van de opgegeven gegevens hebben wij momenteel te weinig vergelijkbare woningen voor een betrouwbare schatting. Onze medewerker neemt persoonlijk contact met u op.',
  },

  valuationNeedsInfo: {
    subject: 'Waardebepaling — wij hebben nog enkele gegevens nodig',
    preheader: 'Voor de schatting hebben wij nog wat extra informatie nodig.',
    heading: 'Wij hebben nog enkele gegevens nodig',
    body: 'Bedankt voor uw aanvraag voor een waardebepaling. Voor de schatting vraagt onze medewerker u om het volgende:',
    after: 'Beantwoord deze e-mail met de ontbrekende gegevens. Zodra wij die hebben ontvangen, maken wij de schatting.',
  },

  rejected: {
    subject: (ref: string) => `Uw advertentie kan niet worden geplaatst — #${ref}`,
    preheader: 'De uitkomst van de beoordeling en de toelichting.',
    heading: 'Wij kunnen de advertentie niet plaatsen',
    body: (title: string, ref: string) =>
      `Het spijt ons: onze medewerker heeft uw advertentie „${title}” (#${ref}) na beoordeling niet goedgekeurd. De toelichting:`,
    refund: 'Heeft u al voor de advertentie betaald? Dan nemen wij over de terugbetaling apart contact met u op.',
    after: 'Heeft u een vraag, of denkt u dat er sprake is van een misverstand? Beantwoord dan gewoon deze e-mail.',
  },

  invoiceIssued: {
    subject: (number: string) => `Factuur — ${number}`,
    preheader: 'De factuur is gereed, u kunt hem bekijken of downloaden via de link.',
    heading: 'Uw factuur is gereed',
    body: (title: string, ref: string, number: string) =>
      `De factuur ${number} bij uw advertentie „${title}” (#${ref}) is gereed.`,
    cta: 'Factuur bekijken',
  },

  creditNoteIssued: {
    subject: (number: string) => `Creditfactuur — ${number}`,
    preheader: 'Wij hebben een creditfactuur opgesteld voor uw eerdere factuur.',
    heading: 'Creditfactuur gereed',
    body: (title: string, ref: string, number: string, correctsNumber: string) =>
      `Bij factuur ${correctsNumber} van uw advertentie „${title}” (#${ref}) hebben wij creditfactuur ${number} opgesteld.`,
    cta: 'Creditfactuur bekijken',
  },

  serviceRequested: {
    subject: 'Uw aanvraag is ontvangen — FODEL',
    preheader: 'Onze medewerker neemt contact met u op om een afspraak te maken.',
    heading: 'Wij hebben uw aanvraag ontvangen',
    body: (service: string, price: string) => `Dank u wel, wij hebben uw aanvraag genoteerd: ${service} (${price}).`,
    next: 'Onze medewerker neemt contact met u op om een afspraak te maken.',
    payment: 'Over de betaling informeren wij u bij het maken van de afspraak. U hoeft nu niets te betalen.',
    cancel: 'Bedenkt u zich? Beantwoord dan gewoon deze e-mail.',
  },

  valuationPaid: {
    subject: 'Betalingsbevestiging — FODEL waardebepaling',
    preheader: 'Dank u wel, uw betaling is ontvangen.',
    heading: 'Dank u wel, uw betaling is ontvangen',
    body: (service: string) => `Wij hebben de betaling voor „${service}” ontvangen.`,
    orderTitle: 'Onderdeel',
    totalLabel: 'Betaald bedrag',
    paidAtLabel: 'Betaald op',
    next: 'Onze medewerker neemt binnenkort contact met u op over de vervolgstappen.',
    invoice: 'Hebt u een factuur nodig? Beantwoord dan gewoon deze e-mail.',
  },

  judicialRequested: {
    subject: 'Aanvraag officiële taxatie — FODEL',
    preheader: 'Onze medewerker neemt contact met u op over de mogelijkheden.',
    heading: 'Wij hebben uw verzoek ontvangen',
    body: 'Dank u wel, wij hebben genoteerd dat u een officiële (gerechtelijke) taxatie door een deskundige wenst. Dit is iets anders dan de indicatieve, marktgebaseerde waardebepaling op onze website: een bevoegde taxateur voert deze uit, op basis van een offerte.',
    next: 'Onze medewerker neemt contact met u op over de mogelijkheden en de offerte.',
  },

  adminServiceRequested: {
    subject: (service: string) => `Nieuwe aanvraag — ${service}`,
    preheader: 'Maak een afspraak met de klant.',
    heading: 'Nieuwe dienstaanvraag',
    labels: {
      service: 'Dienst',
      name: 'Naam',
      email: 'E-mail',
      phone: 'Telefoon',
      where: 'Via',
      note: 'Opmerking',
    },
    sources: {
      submit_form: 'Advertentieformulier',
      listing_editor: 'Advertentie-editor',
      valuation: 'Waardebepaling',
      admin: 'Admin',
    } as Record<string, string>,
    cta: 'Openen in het portaal',
  },

  referralAdminNotice: {
    subject: (referrerName: string) => `Nieuwe aanbeveling — ${referrerName}`,
    preheader: 'Er is een nieuwe aanbevelings-lead binnengekomen via de website.',
    heading: 'Nieuwe aanbeveling ontvangen',
    labels: {
      referrerName: 'Naam aanbeveler',
      referrerEmail: 'E-mail aanbeveler',
      referredName: 'Naam aanbevolen persoon',
      referredEmail: 'E-mail aanbevolen persoon',
    },
    advice: 'Neem contact op met de aanbevolen persoon en noteer, bij een geplaatste advertentie, de aanbeveler voor de bijschrijving.',
  },
} satisfies typeof HU;
