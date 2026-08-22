/*
  The Diaaz configurator's option catalogue.

  Two things are being reconciled here, and they are not the same thing:

    1. DIAAZ'S OWN FORM. https://diaaz.ba/kreiraj-svoj-sto/ asks eight questions
       in a fixed order — izbor stola, oblik, vrsta drveta, tip ploče, boja
       smole, dimenzije, način rezanja, tip i oblik nogu. Their wording, their
       order and their own product photography are reproduced exactly, because
       the whole point of this page is that it is THEIR configurator, working.

    2. THE 3D ENGINE. The live model answers five of those questions — shape,
       wood, plate type, resin colour and base material — plus the leg
       catalogue this build added. Its variants carry English ids because the
       model file is the Textura-derived build the LOOM configurator ships.

  So every option below carries a Bosnian label (what the customer reads) and,
  where the 3D can show it, the engine id it maps to. An option with no `set`
  is a genuine quote-only question: the real form asks it, the model cannot
  draw it, and it travels on the quote instead of silently doing nothing.

  `img` paths point at Diaaz's own option art, lifted from the iOS app's
  Resources/Options and converted to webp. Leg drawings live under
  /diaaz-legs/thumbs and are keyed by the model file name.
*/

const OPT = '/diaaz-assets/opt/'
const LEG = '/diaaz-legs/thumbs/'

/** Every question, in the order diaaz.ba asks it. */
export const SECTIONS = [
  {
    key: 'use',
    title: 'Izbor stola',
    note: 'Za kakav prostor pravimo stol.',
    quoteOnly: true,
    options: [
      { id: 'Trpezarijski sto', img: OPT + 'use-trpezarijski.webp' },
      { id: 'Stol za dnevni boravak', img: OPT + 'use-dnevni.webp' },
      { id: 'Kancelarijski sto', img: OPT + 'use-kancelarijski.webp' },
      { id: 'Stol za vani', img: OPT + 'use-vani.webp' },
    ],
    initial: 'Trpezarijski sto',
  },
  {
    key: 'shape',
    title: 'Oblik stola',
    group: 'Shape',
    options: [
      { id: 'Pravougaonik', set: 'Rectangular', img: OPT + 'shape-rect.webp' },
      { id: 'Kvadrat', set: 'Square', img: OPT + 'shape-square.webp' },
      { id: 'Krug', set: 'Round', img: OPT + 'shape-round.webp' },
      { id: 'Elipsa', set: 'Ellipse', img: OPT + 'shape-ellipse.webp' },
    ],
  },
  {
    key: 'wood',
    title: 'Vrsta drveta',
    group: 'Wood',
    // Orah, epoxy, plava, spider base: the table the page opens on is the one
    // Diaaz's own hero shots sell — walnut with a blue river — not whatever
    // happened to sit first in the list.
    initial: 'Orah',
    options: [
      { id: 'Hrast', set: 'Oak', img: OPT + 'wood-hrast.webp' },
      { id: 'Orah', set: 'Walnut', img: OPT + 'wood-orah.webp' },
      { id: 'Brijest', set: 'Elm', img: OPT + 'wood-brijest.webp' },
      { id: 'Trešnja', set: 'Cherry', img: OPT + 'wood-tresnja.webp' },
      { id: 'Bukva', set: 'Beech', img: OPT + 'wood-bukva.webp' },
      { id: 'Jasen', set: 'Ash', img: OPT + 'wood-jasen.webp' },
    ],
  },
  {
    key: 'plate',
    title: 'Tip ploče',
    group: 'Finish',
    initial: 'Puno drvo sa epoxy smolom',
    options: [
      { id: 'Puno drvo prirodno', set: 'Polished', img: OPT + 'plate-prirodno.webp' },
      { id: 'Puno drvo četkano', set: 'Brushed', img: OPT + 'plate-cetkano.webp' },
      { id: 'Puno drvo sa epoxy smolom', set: 'Epoxy', img: OPT + 'plate-epoxy.webp' },
    ],
  },
  {
    key: 'resin',
    title: 'Boja smole',
    group: 'Resin',
    /*
      The pour is only there on an epoxy top, so picking a colour while the
      plate is solid timber would change nothing on screen and read as broken.
      Choosing one switches the plate to epoxy — see `needsEpoxy` in the page.

      Chips are gradients built from the resin materials' own colours rather
      than photographs: these seven are what the model actually pours, and a
      catalogue photo of a different green would be a promise the 3D breaks.
    */
    needsEpoxy: true,
    initial: 'Plava',
    options: [
      { id: 'Crna', set: 'Black', swatch: 'linear-gradient(118deg,#0B0F11,#3C474D 47%,#0B0F11)' },
      { id: 'Smaragdna', set: 'Emerald', swatch: 'linear-gradient(118deg,#0B5B42,#5FD8AE 47%,#0B5B42)' },
      { id: 'Plava', set: 'Ocean', swatch: 'linear-gradient(118deg,#12667A,#7FE2F3 47%,#12667A)' },
      { id: 'Safirna', set: 'Sapphire', swatch: 'linear-gradient(118deg,#17347A,#7C9FF0 47%,#17347A)' },
      { id: 'Zlatna', set: 'Amber', swatch: 'linear-gradient(118deg,#8A5C10,#F7CE7C 47%,#8A5C10)' },
      { id: 'Crvena', set: 'Crimson', swatch: 'linear-gradient(118deg,#771A16,#F08A83 47%,#771A16)' },
      { id: 'Prozirna', set: 'Clear', swatch: 'linear-gradient(118deg,#B6C4C8,#FFFFFF 47%,#B6C4C8)' },
    ],
  },
  {
    key: 'cut',
    title: 'Način rezanja ploče',
    note: 'Kako ostavljamo rub daske.',
    quoteOnly: true,
    options: [{ id: 'Prirodno sa svih strana' }, { id: 'Prirodno sa dužih strana' }],
    initial: 'Prirodno sa dužih strana',
  },
  {
    key: 'legMaterial',
    title: 'Tip nogu',
    group: 'Base',
    options: [
      { id: 'Drvene', set: 'Timber', swatch: 'linear-gradient(118deg,#3A2A1C,#8A6238 50%,#3A2A1C)' },
      { id: 'Čelik', set: 'Steel', swatch: 'linear-gradient(115deg,#4E5458,#D2D8DC 48%,#4E5458)' },
      { id: 'Mesing', set: 'Brass', swatch: 'linear-gradient(115deg,#7C5E24,#F3DCA8 48%,#7C5E24)' },
      { id: 'Krom', set: 'Chrome', swatch: 'linear-gradient(115deg,#8D959B,#FFFFFF 48%,#8D959B)' },
    ],
  },
  {
    key: 'legs',
    title: 'Oblik nogu',
    group: 'Legs',
    note: 'Cijeli Diaaz katalog nogu, uživo na stolu.',
    options: [
      { id: 'Originalne', set: 'Original', swatch: 'linear-gradient(118deg,#3A2A1C,#8A6238 50%,#3A2A1C)' },
      { id: 'Centralni spajder', set: 'Centralni spajder', img: LEG + 'Centralnispajder.webp' },
      { id: 'Kitzer', set: 'Kitzer', img: LEG + 'Kitzer.webp' },
      { id: 'Kocka velmer', set: 'Kocka velmer', img: LEG + 'Kockavelmer.webp' },
      { id: 'Okrugle konus', set: 'Okrugle konus', img: LEG + 'Okruglekonus.webp' },
      { id: 'Okrugle ravne', set: 'Okrugle ravne', img: LEG + 'Okrugleravne.webp' },
      { id: 'Ravne dijagonalne', set: 'Ravne dijagonalne', img: LEG + 'Ravnedijagonalne.webp' },
      { id: 'Ravne profil kvadrat', set: 'Ravne profil kvadrat', img: LEG + 'Ravneprofilkvadrat.webp' },
      { id: 'Ravne profil pravougaonik', set: 'Ravne profil pravougaonik', img: LEG + 'Ravneprofilpravougaonik.webp' },
      { id: 'Spajder', set: 'Spajder', img: LEG + 'Spajder.webp' },
      { id: 'Trapez', set: 'Trapez', img: LEG + 'Trapeznew.webp' },
      { id: 'X masivni', set: 'X masivni', img: LEG + 'Xmasivni.webp' },
      { id: 'Centralni spajder · metal', set: 'Centralni spajder · metal', img: LEG + 'Centralnispajdermetal.webp' },
      { id: 'Cube', set: 'Cube', img: LEG + 'Cubemetal.webp' },
      { id: 'Elvis Presley', set: 'Elvis Presley', img: LEG + 'Elvispresleymetal.webp' },
      { id: 'Herkul', set: 'Herkul', img: LEG + 'Herkulmetal.webp' },
      { id: 'Krila', set: 'Krila', img: LEG + 'Krilametal.webp' },
      { id: 'Model A', set: 'Model A', img: LEG + 'Modelametal.webp' },
      { id: 'Model X s otvorom', set: 'Model X s otvorom', img: LEG + 'Modelxsacentralnimotvorommetal.webp' },
      { id: 'Model Z', set: 'Model Z', img: LEG + 'Modelzmetal.webp' },
      { id: 'Žičane noge 80/90', set: 'Žičane noge 80/90', img: LEG + 'Modelzicanenoge8090.webp' },
      { id: 'Ravne dijagonale · metal', set: 'Ravne dijagonale · metal', img: LEG + 'Ravnedijagonalemetal.webp' },
      { id: 'Ravne profil kvadrat · metal', set: 'Ravne profil kvadrat · metal', img: LEG + 'Ravneprofilkvadratmetal.webp' },
      { id: 'Ravne profil pravougaonik · metal', set: 'Ravne profil pravougaonik · metal', img: LEG + 'Ravneprofilpravougaonikmetal.webp' },
      { id: 'Ravne tanke', set: 'Ravne tanke', img: LEG + 'Ravnetankametal.webp' },
      { id: 'Spajder · metal', set: 'Spajder · metal', img: LEG + 'Spajdermetal.webp' },
      { id: 'Trapez · metal', set: 'Trapez · metal', img: LEG + 'Trapezmetal.webp' },
      { id: 'X bez spojeva s prorezom', set: 'X bez spojeva s prorezom', img: LEG + 'Xbezspojevasaprorezommetal.webp' },
      { id: 'X bez spojeva', set: 'X bez spojeva', img: LEG + 'Xbezspojevametal.webp' },
      { id: 'X masivni i profil', set: 'X masivni i profil', img: LEG + 'Xmasivniiprofilmetal.webp' },
    ],
  },
]

/** The dimensions question. Numbers, so it is a form row rather than chips. */
export const DIMENSIONS = [
  { key: 'length', label: 'Dužina', unit: 'cm', value: 180, min: 60, max: 400 },
  { key: 'width', label: 'Širina', unit: 'cm', value: 90, min: 40, max: 200 },
  { key: 'height', label: 'Visina', unit: 'cm', value: 76, min: 30, max: 120 },
]

/** Diaaz's own nav, pointing at their live pages. */
export const NAV = [
  { label: 'Početna', href: 'https://diaaz.ba/' },
  { label: 'Shop', href: 'https://diaaz.ba/shop/' },
  { label: 'Masivne ploče', href: 'https://diaaz.ba/masivne-ploce/' },
  { label: 'Galerija', href: 'https://diaaz.ba/galerija/' },
  { label: 'Kontakt', href: 'https://diaaz.ba/kontakt/' },
  { label: 'Showroom', href: 'https://diaaz.ba/showroom/' },
  { label: 'Katalog', href: 'https://diaaz.ba/katalog/' },
]

export const CONTACT = {
  email: 'info@diaaz.ba',
  phone: '+387 62 718 000',
  phoneHref: 'tel:+38762718000',
  source: 'https://diaaz.ba/kreiraj-svoj-sto/',
}
