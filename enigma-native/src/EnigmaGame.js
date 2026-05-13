// EnigmaGame.js — React Native version of the Enigma 20-Questions game
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as LinkingExpo from 'expo-linking';
import Constants from 'expo-constants';
import { supabase } from './config/supabase';
import { genCode, getInitials, fuzzyMatch } from './utils/helpers';
import { sounds } from './utils/sounds';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0a0a1e',
  surface: '#10102a',
  card: '#161634',
  card2: '#1c1c3e',
  border: '#252550',
  border2: '#30305a',
  gold: '#d4a84a',
  gold2: '#f0d070',
  goldDim: '#8a7030',
  violet: '#7c3aed',
  violet2: '#a78bfa',
  text: '#f4f4ff',
  muted: '#9999cc',
  dim: '#5a5a88',
  success: '#34d058',
  danger: '#f85149',
  warn: '#f0a030',
};

// ─── Constants ────────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'personality', label: 'Famous Personality', icon: '👤', desc: 'A real or fictional person known worldwide' },
  { id: 'event', label: 'Historical Event', icon: '📜', desc: 'A pivotal moment that shaped history' },
  { id: 'object', label: 'Legendary Object', icon: '🏺', desc: 'An iconic object of great significance' },
  { id: 'place', label: 'Famous Place', icon: '🗺️', desc: 'A landmark or renowned location' },
  { id: 'invention', label: 'Great Invention', icon: '💡', desc: 'A discovery that changed the world' },
  { id: 'character', label: 'Fictional Character', icon: '🎭', desc: 'A beloved character from books, film or legend' },
];

const AVATARS = [
  { emoji: '🧙', bg: '#1a2a4a' },
  { emoji: '🦊', bg: '#3a1a1a' },
  { emoji: '🐉', bg: '#1a3a1a' },
  { emoji: '🦁', bg: '#3a2a1a' },
  { emoji: '🐺', bg: '#2a1a3a' },
  { emoji: '🦋', bg: '#1a3a3a' },
  { emoji: '⚡', bg: '#3a3a1a' },
  { emoji: '🔥', bg: '#3a1a0a' },
  { emoji: '🌊', bg: '#0a2a3a' },
  { emoji: '🌙', bg: '#1a1a3a' },
  { emoji: '🐯', bg: '#3a2a0a' },
  { emoji: '🦅', bg: '#2a2a1a' },
];

// ─── Content Library ──────────────────────────────────────────────────────────
const CONTENT_LIBRARY = {
  personality: [
    { secret: 'Nikola Tesla', hint: 'A visionary inventor from the 19th century', facts: ['Serbian-American inventor born in 1856 in modern-day Croatia', 'Developed the AC (alternating current) electrical system used worldwide today', 'Had a famous rivalry with Thomas Edison over AC vs DC power', 'Invented the Tesla coil and pioneered radio and wireless power transmission', 'Died alone in a New York hotel room in 1943; his papers were seized by the US government'] },
    { secret: 'Cleopatra VII', hint: 'A ruler of ancient Egypt', facts: ['Last active pharaoh of ancient Egypt, reigning from 51–30 BC', 'Of Greek Macedonian descent — not ethnically Egyptian', 'First Ptolemaic ruler who could actually speak the Egyptian language', 'Had romantic alliances with both Julius Caesar and Mark Antony', 'Died by suicide aged 39, reportedly from a snake bite, ending Egyptian independence'] },
    { secret: 'Mahatma Gandhi', hint: 'A leader of non-violent resistance', facts: ['Born Mohandas Karamchand Gandhi in 1869 in Gujarat, India', 'Led India\'s non-violent independence movement against British rule', 'Developed "Satyagraha" — the philosophy of peaceful civil disobedience', 'Famous for the 1930 Salt March, a 240-mile protest against British salt taxes', 'Assassinated on 30 January 1948, just months after Indian independence'] },
    { secret: 'Marie Curie', hint: 'A pioneering scientist who won two Nobel Prizes', facts: ['Born Maria Skłodowska in Warsaw, Poland in 1867', 'First woman to win a Nobel Prize; the only person to win in two different sciences', 'Discovered two elements: Polonium (named after Poland) and Radium', 'Her notebooks are still radioactive today, stored in lead-lined boxes', 'Died in 1934 from aplastic anaemia caused by decades of radiation exposure'] },
    { secret: 'Napoleon Bonaparte', hint: 'A French military commander who became emperor', facts: ['Born in Corsica in 1769; rose from artillery officer to Emperor of France by age 35', 'His Napoleonic Code legal reforms still underpin law in many countries today', 'At his peak he controlled most of continental Europe', 'Invaded Russia in 1812 with 685,000 soldiers — fewer than 100,000 returned', 'Exiled twice: first to Elba, then to remote Saint Helena where he died in 1821'] },
    { secret: 'Leonardo da Vinci', hint: 'A Renaissance genius known for art and invention', facts: ['Born in 1452 in Vinci, Italy — illegitimate son of a notary and a peasant woman', 'Painter of the Mona Lisa and The Last Supper', 'Designed flying machines, tanks, and solar power centuries before they were invented', 'Wrote all his notebooks in mirror script — right to left, reversed', 'Died in 1519 in France, reportedly in the arms of King Francis I'] },
  ],
  event: [
    { secret: 'Moon Landing (Apollo 11)', hint: 'A historic 1969 space mission', facts: ['Apollo 11 launched on 16 July 1969, carrying Armstrong, Aldrin, and Collins', 'Neil Armstrong became the first human to walk on the Moon on 20 July 1969', 'His words: "That\'s one small step for man, one giant leap for mankind"', 'Buzz Aldrin joined him on the surface; Michael Collins orbited above alone', 'Fulfilled President Kennedy\'s 1961 pledge to land on the Moon before the decade\'s end'] },
    { secret: 'Fall of the Berlin Wall', hint: 'A pivotal 1989 event in European history', facts: ['The Berlin Wall divided East and West Germany from 1961 to 1989', 'Built to stop mass emigration from Communist East Germany to the West', 'On 9 November 1989 a misread announcement triggered crowds to rush the checkpoints', 'Guards stood down and Berliners began demolishing the wall with hammers', 'Led directly to German reunification in 1990 and the end of the Cold War'] },
    { secret: 'The French Revolution', hint: 'A late 18th century uprising that transformed a nation', facts: ['Began in 1789, driven by financial crisis, food shortages, and extreme inequality', 'Storming of the Bastille on 14 July 1789 is its symbolic start', 'King Louis XVI was executed by guillotine in January 1793', 'The Reign of Terror (1793–94) saw over 17,000 people officially executed', 'Ended with Napoleon\'s coup in 1799, replacing the republic with his rule'] },
    { secret: 'The Black Death', hint: 'A devastating 14th century pandemic', facts: ['A bubonic plague epidemic that swept Europe from 1347 to 1351', 'Killed an estimated 30–60% of Europe\'s population — roughly 25 million people', 'Spread by fleas on rats that arrived on merchant ships from Asia', 'Took Europe over 200 years to recover its pre-plague population', 'Indirectly ended feudalism by creating labour shortages that gave peasants bargaining power'] },
    { secret: 'Signing of the Magna Carta', hint: 'A 1215 document that changed the rule of law', facts: ['Signed on 15 June 1215 by King John of England at Runnymede', 'Rebellious barons forced the king to sign it to limit royal power', 'Established that even the king must obey the law — a revolutionary idea', 'Introduced the right to a fair trial that underpins modern legal systems', 'Only four original copies survive, all kept in England'] },
    { secret: 'World War II', hint: 'The largest and most destructive war in history', facts: ['Fought from 1939 to 1945, involving more than 30 countries', 'Started when Nazi Germany invaded Poland on 1 September 1939', 'Approximately 70–85 million people died — around 3% of the world\'s population', 'The Holocaust saw the systematic murder of 6 million Jewish people by the Nazi regime', 'Ended in Europe on 8 May 1945 (VE Day) and in the Pacific on 2 September 1945 (VJ Day)'] },
  ],
  object: [
    { secret: 'Excalibur', hint: 'A legendary sword from Arthurian legend', facts: ['The magical sword of King Arthur in British legend and medieval romance', 'In most versions, pulled from a stone or given by the Lady of the Lake', 'Symbolised Arthur\'s divine right to rule as King of Britain', 'Said to be unbreakable and grant its bearer extraordinary power', 'Returned to the lake at Arthur\'s death — thrown by the knight Sir Bedivere'] },
    { secret: 'The Rosetta Stone', hint: 'An ancient stone that unlocked a forgotten script', facts: ['A granodiorite stele discovered in 1799 by French soldiers in Egypt', 'Inscribed with the same decree in three scripts: hieroglyphs, Demotic, and Ancient Greek', 'The Greek section let scholars decode Egyptian hieroglyphics for the first time', 'Jean-François Champollion cracked the hieroglyphic code in 1822', 'Held in the British Museum since 1802; Egypt regularly requests its return'] },
    { secret: 'The Hope Diamond', hint: 'A famously cursed blue gemstone', facts: ['One of the world\'s largest blue diamonds, weighing 45.52 carats', 'Believed to have originated in India; first recorded in the 17th century', 'Said to carry a curse bringing misfortune and death to its owners', 'Its history includes French royal ownership and theft during the Revolution', 'Now on display at the Smithsonian Natural History Museum in Washington D.C.'] },
    { secret: 'The Holy Grail', hint: 'A sacred vessel from Christian and Arthurian tradition', facts: ['Believed to be the cup used by Jesus at the Last Supper', 'Also said to be the cup that caught Christ\'s blood at the Crucifixion', 'The supreme quest of the Knights of the Round Table in Arthurian legend', 'No verified physical version has ever been confirmed to exist', 'Inspired works from medieval romance to Monty Python and Indiana Jones'] },
    { secret: 'The Mona Lisa', hint: 'The world\'s most famous painting', facts: ['Painted by Leonardo da Vinci between approximately 1503 and 1519', 'Subject is believed to be Lisa Gherardini, wife of a Florentine merchant', 'Famous for her ambiguous smile and eyes that seem to follow the viewer', 'Stolen from the Louvre in 1911 by an Italian employee; recovered two years later', 'Now behind bulletproof glass at the Louvre, Paris — visited by millions yearly'] },
    { secret: 'The Ark of the Covenant', hint: 'A sacred container from ancient Hebrew scripture', facts: ['A gold-covered wooden chest said to hold the stone tablets of the Ten Commandments', 'Built under Moses\' instructions during the Israelites\' time in the wilderness', 'Said to have miraculous powers — killing those who touched it improperly', 'Kept in Solomon\'s Temple until the Babylonian conquest around 597 BC', 'Its current location is unknown and has inspired centuries of legend and searching'] },
  ],
  place: [
    { secret: 'The Great Wall of China', hint: 'A massive ancient fortification in East Asia', facts: ['A series of walls built across northern China over many centuries', 'Most of what stands today is from the Ming dynasty (1368–1644)', 'Stretches roughly 21,196 km in total length including all branches', 'Popular myth: it is NOT visible from space with the naked eye', 'Built primarily to defend against Mongol and nomadic invasions from the north'] },
    { secret: 'The Eiffel Tower', hint: 'A famous iron structure in a European capital', facts: ['Designed by engineer Gustave Eiffel for the 1889 World\'s Fair in Paris', 'Standing 330 metres tall, it was the world\'s tallest structure for 41 years', 'Made from 18,038 pieces of iron, assembled with 2.5 million rivets', 'Originally planned to be demolished after 20 years; saved because it served as a radio tower', 'Receives about 7 million visitors per year — one of the world\'s most visited monuments'] },
    { secret: 'Machu Picchu', hint: 'An ancient citadel high in the South American Andes', facts: ['A 15th-century Inca citadel in Peru, at 2,430 metres elevation', 'Built around 1450 AD, abandoned less than 100 years later during the Spanish conquest', 'Rediscovered by American historian Hiram Bingham in 1911', 'Built without mortar — the stones fit so precisely a knife cannot fit between them', 'A UNESCO World Heritage Site and one of the New Seven Wonders of the World'] },
    { secret: 'The Colosseum', hint: 'An ancient amphitheatre in the heart of Rome', facts: ['An oval amphitheatre in Rome built between 70–80 AD under Emperor Vespasian', 'Could hold 50,000 to 80,000 spectators for gladiatorial and other public events', 'Used for gladiator fights, animal hunts, public executions, and dramatic performances', 'Estimated over 400,000 people and 1 million animals died within its walls', 'Two-thirds of the original structure was lost to earthquakes and stone robbing over centuries'] },
    { secret: 'The Taj Mahal', hint: 'A white marble mausoleum in India', facts: ['A white marble mausoleum in Agra, India, built by Mughal Emperor Shah Jahan', 'Commissioned in 1632 as a tomb for his wife Mumtaz Mahal, who died in childbirth', 'Took approximately 22 years and 22,000 workers to complete', 'The minarets lean slightly outward so they fall away from the tomb in an earthquake', 'A UNESCO World Heritage Site and one of the New Seven Wonders of the World'] },
    { secret: 'Mount Everest', hint: 'The world\'s highest mountain above sea level', facts: ['Located in the Himalayas on the Nepal–Tibet border at 8,848.86 metres', 'Named after Sir George Everest, the British surveyor who first mapped it', 'First summited on 29 May 1953 by Edmund Hillary and Tenzing Norgay', 'Known locally as "Sagarmatha" in Nepal and "Chomolungma" in Tibet', 'Over 300 bodies remain on the mountain — too dangerous and costly to recover'] },
  ],
  invention: [
    { secret: 'The Printing Press', hint: 'A 15th century invention that spread knowledge worldwide', facts: ['Invented by Johannes Gutenberg in Germany around 1440', 'Used movable metal type, enabling books to be mass-produced for the first time', 'The first major work printed was the Gutenberg Bible, around 1455', 'Within 50 years, over 20 million books had been printed across Europe', 'Directly enabled the Renaissance, Reformation, and Scientific Revolution'] },
    { secret: 'The Telephone', hint: 'A 19th century device for voice communication at distance', facts: ['Alexander Graham Bell patented the first practical telephone on 7 March 1876', 'Famous first words spoken: "Mr. Watson, come here, I want to see you"', 'Elisha Gray filed a similar patent hours after Bell — courts awarded Bell the patent', 'Bell preferred to be remembered as a teacher of the deaf, not an inventor', 'The telephone fundamentally changed how people communicated across distances'] },
    { secret: 'Penicillin', hint: 'A life-saving medicine discovered almost by accident', facts: ['Discovered accidentally by Alexander Fleming in 1928 — mould contaminated his bacteria dish', 'The Penicillium mould was killing all the surrounding bacteria', 'Fleming published his findings but couldn\'t isolate the active ingredient and moved on', 'Howard Florey and Ernst Chain developed it into a usable medicine in the early 1940s', 'Mass production during WWII saved millions of lives; all three shared the 1945 Nobel Prize'] },
    { secret: 'The Internet', hint: 'A global network connecting billions of devices', facts: ['Originated from ARPANET, a US military research network first used in 1969', 'The first message sent was "LOGIN" — the system crashed after just "LO"', 'Tim Berners-Lee invented the World Wide Web in 1989, making it accessible to everyone', 'The first public website went live on 6 August 1991', 'Today over 5 billion people use the internet — more than 60% of the world population'] },
    { secret: 'The Steam Engine', hint: 'The invention that powered the Industrial Revolution', facts: ['James Watt\'s improved steam engine (1769) made it practical for widespread industrial use', 'Earlier versions existed (Newcomen\'s 1712 engine) but were far too inefficient', 'Watt\'s engine was four times more fuel-efficient than Newcomen\'s design', 'Powered factories, trains, and ships — transforming how goods were made and moved', 'The unit of power, the "watt", is named in his honour'] },
    { secret: 'The Light Bulb', hint: 'An invention that brought artificial light to everyday life', facts: ['Thomas Edison developed the first commercially viable incandescent bulb in 1879', 'He tested thousands of materials before finding carbonised bamboo as the ideal filament', 'Earlier versions existed but lasted only minutes — Edison made one lasting 1,200+ hours', 'He also built New York\'s first power station in 1882 to bring electricity to homes', 'Today\'s LED bulbs use up to 90% less energy than Edison\'s original incandescent design'] },
  ],
  character: [
    { secret: 'Sherlock Holmes', hint: 'A brilliant fictional detective from Victorian London', facts: ['Created by Arthur Conan Doyle; first appeared in A Study in Scarlet (1887)', 'Lives at 221B Baker Street, London, with his friend and chronicler Dr. John Watson', 'Famous for extraordinary deductive reasoning and hyper-keen observation', 'His arch-nemesis is Professor James Moriarty, "the Napoleon of Crime"', 'Doyle killed him off in 1893 but public outcry forced a resurrection in 1903'] },
    { secret: 'Harry Potter', hint: 'A young wizard from a celebrated modern book series', facts: ['Created by J.K. Rowling; first appeared in Harry Potter and the Philosopher\'s Stone (1997)', 'An orphan who discovers he is a wizard on his 11th birthday', 'Attends Hogwarts School of Witchcraft and Wizardry, sorted into Gryffindor house', 'Has a lightning-bolt scar from surviving Voldemort\'s Killing Curse as a baby', 'The series has sold over 600 million copies — one of the best-selling series ever'] },
    { secret: 'Darth Vader', hint: 'An iconic villain from a famous space opera franchise', facts: ['Real name Anakin Skywalker — a fallen Jedi who turned to the dark side of the Force', 'Appears in George Lucas\'s Star Wars, first in Episode IV: A New Hope (1977)', 'Recognised by his black armour, helmet, and distinctive mechanical breathing sound', 'Famous line: "No, I am your father" — one of cinema\'s greatest ever plot twists', 'Redeemed himself in Episode VI by saving his son Luke Skywalker, dying peacefully'] },
    { secret: 'Elizabeth Bennet', hint: 'A witty and independent heroine from a classic novel', facts: ['Protagonist of Jane Austen\'s Pride and Prejudice, published in 1813', 'Second of five Bennet sisters; known for her intelligence, wit, and independence', 'Her famous love interest is the proud and wealthy Mr. Fitzwilliam Darcy', 'Both misjudge each other at first before realising their mutual love', 'Often ranked among literature\'s greatest heroines for her humour and moral clarity'] },
    { secret: 'Gandalf', hint: 'A wise and powerful wizard from a beloved fantasy world', facts: ['Created by J.R.R. Tolkien; appears in The Hobbit (1937) and The Lord of the Rings (1954–55)', 'One of the Istari — angelic beings sent to Middle-earth to resist the dark lord Sauron', 'Known as Gandalf the Grey; returns as Gandalf the White after defeating the Balrog', 'Famous for his fireworks, his pipe, and "You shall not pass!" on the Bridge of Khazad-dûm', 'His true angelic name is Olórin; Gandalf is the name given by Men of the North'] },
    { secret: 'James Bond', hint: 'A famous fictional spy working for British intelligence', facts: ['Created by novelist Ian Fleming; first appeared in Casino Royale (1953)', 'A secret agent for MI6 with the code number 007', 'Famous for "Bond, James Bond" and Martinis "shaken, not stirred"', 'Has been played by seven official actors including Sean Connery and Daniel Craig', 'Fleming based Bond partly on wartime intelligence agents he worked with in WWII'] },
  ],
};

const DEMO_PLAYERS = [
  { name: 'Ayesha', avatarIdx: 1 },
  { name: 'Marcus', avatarIdx: 2 },
  { name: 'Sofia', avatarIdx: 3 },
  { name: 'Jin', avatarIdx: 4 },
];

// ─── Daily Challenge helpers ──────────────────────────────────────────────────
const getTodayUTC = () => new Date().toISOString().slice(0, 10);

const getDailyChallenge = () => {
  const today = getTodayUTC();
  let hash = 5381;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) + hash + today.charCodeAt(i)) & 0x7fffffff;
  }
  // Interleave across categories so consecutive seeds cycle through all themes:
  // slot 0 → personality[0], slot 1 → event[0], slot 2 → object[0], ...
  // slot 6 → personality[1], slot 7 → event[1], etc.
  const themeIds = Object.keys(CONTENT_LIBRARY);
  const maxItems = Math.max(...themeIds.map((id) => CONTENT_LIBRARY[id].length));
  const flat = [];
  for (let i = 0; i < maxItems; i++) {
    for (const id of themeIds) {
      if (i < CONTENT_LIBRARY[id].length) flat.push({ themeId: id, item: CONTENT_LIBRARY[id][i] });
    }
  }
  const picked = flat[Math.abs(hash) % flat.length];
  const theme = THEMES.find((t) => t.id === picked.themeId) || THEMES[0];
  return { theme, item: picked.item, date: today };
};

const SERVER_URL = Constants.expoConfig?.extra?.serverUrl || 'https://enigma-game-production.up.railway.app';

const askGemini = async (secret, facts, question) => {
  try {
    const res = await fetch(`${SERVER_URL}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, facts, question }),
    });
    const data = await res.json();
    return { answer: data.answer || 'NO', note: data.note || '' };
  } catch {
    return { answer: 'NO', note: '' };
  }
};

const dailyStars = (questions, solved) => {
  if (!solved) return { stars: 0, label: 'Better luck tomorrow!' };
  if (questions <= 5)  return { stars: 3, label: 'Legendary! ✦✦✦' };
  if (questions <= 10) return { stars: 2, label: 'Expert! ✦✦' };
  if (questions <= 15) return { stars: 1, label: 'Good! ✦' };
  return { stars: 0, label: 'Squeaked it!' };
};

const av = (idx) => AVATARS[idx % AVATARS.length];

// ─── Sub-components ───────────────────────────────────────────────────────────
function PlayerAvatar({ p, size = 36 }) {
  const a = av(p.avatarIdx);
  const fs = size <= 26 ? 14 : 20;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Text style={{ fontSize: fs }}>{a.emoji}</Text>
    </View>
  );
}

function SimBar({ players, viewerId, onSwitch, onHome, topInset = 0 }) {
  return (
    <View style={{
      backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border2,
      paddingHorizontal: 12, paddingTop: topInset + 10, paddingBottom: 10,
      flexDirection: 'row', alignItems: 'center',
    }}>
      <TouchableOpacity
        onPress={onHome}
        style={{ borderWidth: 1, borderColor: C.border2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6 }}
      >
        <Text style={{ fontSize: 14 }}>🏠</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 9, fontFamily: 'Outfit_700Bold', color: C.dim, letterSpacing: 2, marginRight: 6 }}>
        VIEW AS:
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        {players.map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => onSwitch(p.id)}
            style={{
              backgroundColor: viewerId === p.id ? 'rgba(200,168,74,0.12)' : C.card,
              borderWidth: 1,
              borderColor: viewerId === p.id ? C.goldDim : C.border2,
              borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6,
            }}
          >
            <Text style={{
              fontSize: 11, fontFamily: 'Outfit_600SemiBold',
              color: viewerId === p.id ? C.gold : C.muted,
            }}>
              {p.isHost ? '👑 ' : ''}{p.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function AvatarPicker({ selected, onSelect }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
        Choose Your Avatar
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {AVATARS.map((a, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onSelect(i)}
            style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: a.bg,
              borderWidth: selected === i ? 3 : 1.5,
              borderColor: selected === i ? C.gold : C.border2,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: selected === i ? 22 : 26 }}>{a.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Divider({ label = 'or' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border2 }} />
      <Text style={{ marginHorizontal: 10, fontSize: 10, color: C.dim, letterSpacing: 2, fontFamily: 'Outfit_600SemiBold' }}>
        {label.toUpperCase()}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border2 }} />
    </View>
  );
}

function Chip({ label, style = 'gold' }) {
  const isGold = style === 'gold';
  return (
    <View style={{
      backgroundColor: isGold ? 'rgba(200,168,74,0.1)' : 'rgba(109,40,217,0.15)',
      borderWidth: 1,
      borderColor: isGold ? C.goldDim : 'rgba(109,40,217,0.3)',
      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
    }}>
      <Text style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: isGold ? C.gold : C.violet2 }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EnigmaGame() {
  const insets = useSafeAreaInsets();

  const [screen, setScreen] = useState('home');
  const [game, setGame] = useState(null);
  const [viewerId, setViewerId] = useState(null);

  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [hintInput, setHintInput] = useState('');
  const [solveInput, setSolveInput] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [solveModalOpen, setSolveModalOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [partlyMode, setPartlyMode] = useState(false);
  const [partlyNote, setPartlyNote] = useState('');
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState(0);
  const [secretSource, setSecretSource] = useState('library');
  const [libraryBriefing, setLibraryBriefing] = useState(null);
  const [isPublicRoom, setIsPublicRoom] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Daily challenge state
  const [dailyChallengeData, setDailyChallengeData] = useState(null);
  const [dailyPhase, setDailyPhase] = useState('intro');  // 'intro' | 'game' | 'result'
  const [dailyQuestions, setDailyQuestions] = useState([]);
  const [dailyInput, setDailyInput] = useState('');
  const [dailyAsking, setDailyAsking] = useState(false);
  const [dailySolveOpen, setDailySolveOpen] = useState(false);
  const [dailySolveInput, setDailySolveInput] = useState('');
  const [dailyResult, setDailyResult] = useState(null);
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);
  const [dailyLoadingBoard, setDailyLoadingBoard] = useState(false);

  const feedScrollRef = useRef(null);
  const gameRef = useRef(game);
  const [guesserSecsLeft, setGuesserSecsLeft] = useState(30);
  const [hostSecsLeft, setHostSecsLeft] = useState(15);
  const [timeoutToast, setTimeoutToast] = useState(null);
  const [hostWarningData, setHostWarningData] = useState(null);
  const [hostWarningSecsLeft, setHostWarningSecsLeft] = useState(10);

  // Deep link handling (QR code scans)
  useEffect(() => {
    const handleURL = ({ url }) => {
      try {
        const parsed = LinkingExpo.parse(url);
        const code = parsed.queryParams?.join || parsed.queryParams?.code;
        if (code) { setCodeInput(code.toUpperCase()); setScreen('join'); }
      } catch {}
    };
    LinkingExpo.getInitialURL().then((url) => { if (url) handleURL({ url }); }).catch(() => {});
    const sub = LinkingExpo.addEventListener('url', handleURL);
    return () => sub.remove();
  }, []);

  // Auto-scroll Q feed
  useEffect(() => {
    if (feedScrollRef.current) {
      setTimeout(() => feedScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [game?.questions?.length]);

  // Supabase real-time sync
  useEffect(() => {
    if (!game?.roomCode) return;
    const channel = supabase
      .channel(`session:${game.roomCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `room_code=eq.${game.roomCode}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setGame(null); setViewerId(null); setScreen('home');
            setTimeoutToast('The host closed this room.');
            setTimeout(() => setTimeoutToast(null), 4000);
            return;
          }
          const updated = payload.new?.data;
          if (!updated) return;
          const stillIn = updated.players?.some((p) => p.id === viewerId);
          if (!stillIn) {
            setGame(null); setViewerId(null); setScreen('home');
            return;
          }
          setGame(updated);
          setScreen((cur) => {
            if (updated.status === 'lobby') return 'lobby';
            if (updated.status === 'theme_select') return 'theme';
            if (updated.status === 'secret_entry') return cur;
            if (updated.status === 'playing') return 'game';
            if (updated.status === 'round_end') return cur === 'scoreboard' ? 'scoreboard' : 'result';
            return cur;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [game?.roomCode, viewerId]);

  // Auto game-over check
  useEffect(() => {
    if (screen !== 'game' || !game || game.status !== 'playing') return;
    const activeG = game.players.filter((p) => !p.isHost && !p.isEliminated);
    const qUsed = game.questions.filter((q) => q.answer !== null).length;
    if (activeG.length === 0 || qUsed >= 20) endRound(null, game);
  }, [game?.players, game?.questions]);

  // Keep gameRef in sync for use inside timer callbacks
  useEffect(() => { gameRef.current = game; }, [game]);

  // Guesser: 30-second turn timer — derives all conditions from raw state, not component-level consts
  useEffect(() => {
    if (!game || screen !== 'game') { setGuesserSecsLeft(30); return; }
    const vwr = game.players.find(p => p.id === viewerId);
    if (!vwr || vwr.isHost || vwr.isEliminated) { setGuesserSecsLeft(30); return; }
    const active = game.players.filter(p => !p.isHost && !p.isEliminated);
    const cur = active.length ? active[game.currentQuestionerIndex % active.length] : null;
    if (cur?.id !== viewerId) { setGuesserSecsLeft(30); return; }
    if (game.questions.some(q => q.answer === null)) { setGuesserSecsLeft(30); return; }

    let secs = 30;
    setGuesserSecsLeft(30);
    const iv = setInterval(() => {
      secs--;
      setGuesserSecsLeft(secs);
      if (secs <= 0) {
        clearInterval(iv);
        const g = gameRef.current;
        const active2 = g.players.filter(p => !p.isHost && !p.isEliminated);
        const nextIdx = (g.currentQuestionerIndex + 1) % (active2.length || 1);
        const nextName = active2[nextIdx]?.name || 'Next player';
        setTimeoutToast(`⏱ Time's up! ${nextName}'s turn`);
        setTimeout(() => setTimeoutToast(null), 3000);
        const ng = { ...g, currentQuestionerIndex: g.currentQuestionerIndex + 1 };
        setGame(ng);
        syncGame(ng);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [screen, game?.currentQuestionerIndex, viewerId]);

  // Host primary timer: 15s — on expiry opens the 10s warning modal
  useEffect(() => {
    if (!game || screen !== 'game') { setHostSecsLeft(15); setHostWarningData(null); return; }
    const vwr = game.players.find(p => p.id === viewerId);
    if (!vwr?.isHost) { setHostSecsLeft(15); setHostWarningData(null); return; }
    const pq = game.questions.find(q => q.answer === null);
    if (!pq) { setHostSecsLeft(15); setHostWarningData(null); return; }

    setHostWarningData(null);
    let secs = 15;
    setHostSecsLeft(15);
    const iv = setInterval(() => {
      secs--;
      setHostSecsLeft(secs);
      if (secs <= 0) {
        clearInterval(iv);
        const g = gameRef.current;
        const pending = g.questions.find(q => q.answer === null);
        if (pending) setHostWarningData({ question: pending.text, questionId: pending.id });
      }
    }, 1000);
    return () => { clearInterval(iv); setHostWarningData(null); };
  }, [screen, game?.questions?.filter(q => q.answer === null).length, viewerId]);

  // Host warning timer: 10s within the modal — handles miss/eliminate logic
  useEffect(() => {
    if (!hostWarningData) return;
    let secs = 10;
    setHostWarningSecsLeft(10);
    const iv = setInterval(() => {
      secs--;
      setHostWarningSecsLeft(secs);
      if (secs <= 0) {
        clearInterval(iv);
        setHostWarningData(null);
        const g = gameRef.current;
        const misses = (g.hostConsecutiveMisses || 0) + 1;
        const questions = g.questions.map(q => q.answer === null ? { ...q, answer: 'SKIP', note: '' } : q);
        if (misses === 1) {
          const ng = { ...g, questions, currentQuestionerIndex: g.currentQuestionerIndex + 1, hostConsecutiveMisses: 1 };
          setGame(ng);
          syncGame(ng);
          setTimeoutToast('⚠️ Miss 1 of 2 — question skipped. Miss again and you lose the host role!');
          setTimeout(() => setTimeoutToast(null), 6000);
        } else {
          const activeGuessers = g.players.filter(p => !p.isHost && !p.isEliminated);
          if (activeGuessers.length >= 2) {
            const newHost = activeGuessers[0];
            const players = g.players.map(p => {
              if (p.isHost) return { ...p, isHost: false, isEliminated: true };
              if (p.id === newHost.id) return { ...p, isHost: true };
              return p;
            });
            const ng = { ...g, players, questions, currentQuestionerIndex: 0, hostConsecutiveMisses: 0 };
            setGame(ng);
            syncGame(ng);
            setTimeoutToast(`👑 Host eliminated!\n${newHost.name} is now the new host and can see the secret.`);
            setTimeout(() => setTimeoutToast(null), 6000);
          } else {
            endRound(null, { ...g, questions });
          }
        }
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [hostWarningData]);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const viewer = game?.players.find((p) => p.id === viewerId);
  const host = game?.players.find((p) => p.isHost);
  const activeGuessers = game?.players.filter((p) => !p.isHost && !p.isEliminated) || [];
  const currentQuestioner = activeGuessers.length > 0
    ? activeGuessers[game.currentQuestionerIndex % activeGuessers.length]
    : null;
  const viewerIsHost = viewer?.isHost;
  const viewerIsEliminated = viewer?.isEliminated && !viewer?.isHost;
  const isMyTurn = currentQuestioner?.id === viewerId;
  const pendingQ = game?.questions.find((q) => q.answer === null);
  const answeredQs = game?.questions.filter((q) => q.answer !== null && q.answer !== 'SKIP').length || 0;

  // ─── Supabase helpers ─────────────────────────────────────────────────────
  const uniqueCode = async () => {
    let code;
    do {
      code = genCode();
      const { data } = await supabase.from('sessions').select('room_code').eq('room_code', code).maybeSingle();
      if (!data) break;
    } while (true);
    return code;
  };

  const syncGame = async (g) => {
    if (!g?.roomCode) return;
    try { await supabase.from('sessions').upsert({ room_code: g.roomCode, data: g, is_public: !!g.isPublic }); } catch {}
  };

  const loadPublicRooms = async () => {
    setLoadingRooms(true);
    try {
      const { data } = await supabase
        .from('sessions')
        .select('room_code, data, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(30);
      const rows = (data || [])
        .filter((r) => r.data?.status === 'lobby')
        .map((r) => {
          const hostP = r.data.players?.find((p) => p.isHost);
          return {
            roomCode: r.room_code,
            hostName: hostP?.name || 'Unknown host',
            hostAvatarIdx: hostP?.avatarIdx ?? 0,
            playerCount: r.data.players?.length || 0,
            createdAt: r.created_at,
          };
        });
      setPublicRooms(rows);
    } catch {
      setPublicRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const joinPublicRoom = async (roomCode) => {
    if (!nameInput.trim()) {
      Alert.alert('Name required', 'Please enter your name before joining a room.');
      return;
    }
    setCodeInput(roomCode);
    // Reuse joinGame's logic by setting code and calling it
    try {
      const { data: row, error } = await supabase
        .from('sessions')
        .select('data')
        .eq('room_code', roomCode)
        .single();
      if (error || !row) throw new Error('Room no longer available');
      const session = row.data;
      if (session.status !== 'lobby') throw new Error('Game already started');
      const existingIds = new Set(session.players.map((p) => p.id));
      let nextNum = session.players.length + 1;
      let playerId = `p${nextNum}`;
      while (existingIds.has(playerId)) { nextNum++; playerId = `p${nextNum}`; }
      const sessionData = {
        ...session,
        players: [...session.players, {
          id: playerId, name: nameInput.trim(), score: 0,
          isHost: false, isEliminated: false, avatarIdx: selectedAvatarIdx,
        }],
      };
      await supabase.from('sessions').upsert({ room_code: roomCode, data: sessionData, is_public: !!sessionData.isPublic });
      setGame(sessionData);
      setViewerId(playerId);
      setNameInput('');
      setCodeInput('');
      setScreen('lobby');
    } catch (e) {
      Alert.alert('Could not join', e.message || 'This room is no longer available.');
      loadPublicRooms();
    }
  };

  // ─── Daily challenge actions ──────────────────────────────────────────────
  const openDailyChallenge = () => {
    setDailyChallengeData(getDailyChallenge());
    setDailyPhase('intro');
    setDailyQuestions([]);
    setDailyInput('');
    setDailyResult(null);
    setDailyLeaderboard([]);
    setScreen('daily');
  };

  const submitDailyQuestion = async () => {
    if (!dailyInput.trim() || dailyAsking || !dailyChallengeData) return;
    const text = dailyInput.trim();
    setDailyInput('');
    setDailyAsking(true);
    const { answer, note } = await askGemini(
      dailyChallengeData.item.secret,
      dailyChallengeData.item.facts,
      text,
    );
    setDailyAsking(false);
    const q = { id: Date.now(), text, answer, note };
    const updated = [...dailyQuestions, q];
    setDailyQuestions(updated);
    if (answer === 'YES') sounds.yes();
    else if (answer === 'NO') sounds.no();
    else sounds.partly();
    // Auto-finish when 20 questions used
    if (updated.length >= 20) finishDaily(false, updated);
  };

  const submitDailyGuess = async () => {
    if (!dailySolveInput.trim() || !dailyChallengeData) return;
    const guess = dailySolveInput.trim();
    setDailySolveInput('');
    setDailySolveOpen(false);
    const correct = fuzzyMatch(guess, dailyChallengeData.item.secret);
    if (correct) {
      sounds.win();
      finishDaily(true, dailyQuestions);
    } else {
      sounds.eliminated();
      Alert.alert('Not quite!', `"${guess}" is not the answer. Keep asking questions!`);
    }
  };

  const finishDaily = async (solved, questions = dailyQuestions) => {
    const questionsUsed = questions.length;
    setDailyResult({ solved, questionsUsed });
    setDailyPhase('result');
    const playerName = nameInput.trim() || 'Anonymous';
    try {
      await supabase.from('daily_scores').insert({
        date: dailyChallengeData.date,
        player_name: playerName,
        avatar_idx: selectedAvatarIdx,
        questions: questionsUsed,
        solved,
      });
    } catch {}
    loadDailyLeaderboard(dailyChallengeData.date);
  };

  const loadDailyLeaderboard = async (date) => {
    setDailyLoadingBoard(true);
    try {
      const { data } = await supabase
        .from('daily_scores')
        .select('player_name, avatar_idx, questions, solved')
        .eq('date', date)
        .eq('solved', true)
        .order('questions', { ascending: true })
        .limit(10);
      setDailyLeaderboard(data || []);
    } catch {
      setDailyLeaderboard([]);
    } finally {
      setDailyLoadingBoard(false);
    }
  };

  // ─── Actions ──────────────────────────────────────────────────────────────
  const createGame = async () => {
    if (!nameInput.trim()) return;
    try {
      const roomCode = await uniqueCode();
      const playerId = 'p1';
      const session = {
        roomCode,
        players: [{ id: playerId, name: nameInput.trim(), score: 0, isHost: true, isEliminated: false, avatarIdx: selectedAvatarIdx }],
        round: 1, theme: null, secretAnswer: '', hostHint: '',
        questions: [], currentQuestionerIndex: 0, status: 'lobby',
        pendingSolve: null, roundWinnerId: null, hostConsecutiveMisses: 0,
        isPublic: isPublicRoom, createdAt: new Date().toISOString(),
      };
      await supabase.from('sessions').upsert({ room_code: roomCode, data: session, is_public: isPublicRoom });
      setGame(session);
      setViewerId(playerId);
      setNameInput('');
      setScreen('lobby');
    } catch {
      Alert.alert('Error', 'Could not create game. Check your connection.');
    }
  };

  const joinGame = async () => {
    if (codeInput.length !== 6 || !nameInput.trim()) return;
    const roomCode = codeInput.toUpperCase();
    try {
      const { data: row, error } = await supabase
        .from('sessions')
        .select('data')
        .eq('room_code', roomCode)
        .single();
      if (error || !row) throw new Error('Session not found');
      const session = row.data;
      if (session.status !== 'lobby') throw new Error('Game already in progress');
      const existingIds = new Set(session.players.map((p) => p.id));
      let nextNum = session.players.length + 1;
      let playerId = `p${nextNum}`;
      while (existingIds.has(playerId)) { nextNum++; playerId = `p${nextNum}`; }
      const sessionData = {
        ...session,
        players: [...session.players, {
          id: playerId, name: nameInput.trim(), score: 0,
          isHost: false, isEliminated: false, avatarIdx: selectedAvatarIdx,
        }],
      };
      await supabase.from('sessions').upsert({ room_code: roomCode, data: sessionData, is_public: !!sessionData.isPublic });
      setGame(sessionData);
      setViewerId(playerId);
      setNameInput('');
      setCodeInput('');
      setScreen('lobby');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not join session');
    }
  };

  const addDemoPlayer = async (dp) => {
    if (!game) return;
    const id = `p${game.players.length + 1}`;
    const p = { id, name: dp.name, score: 0, isHost: false, isEliminated: false, avatarIdx: dp.avatarIdx };
    const newGame = { ...game, players: [...game.players, p] };
    setGame(newGame);
    await syncGame(newGame);
  };

  const startGame = async () => {
    const newGame = { ...game, status: 'theme_select' };
    setGame(newGame);
    setScreen('theme');
    await syncGame(newGame);
  };

  const confirmTheme = async () => {
    if (!selectedTheme) return;
    const newGame = { ...game, theme: selectedTheme, status: 'secret_entry' };
    setGame(newGame);
    setSecretSource('library');
    setScreen('secret');
    await syncGame(newGame);
  };

  const lockSecret = async (secretOverride, hintOverride) => {
    const secret = (secretOverride ?? secretInput).trim();
    const hint = (hintOverride ?? hintInput).trim();
    if (!secret) return;
    const newGame = {
      ...game, secretAnswer: secret, hostHint: hint,
      status: 'playing', questions: [], currentQuestionerIndex: 0, pendingSolve: null, hostConsecutiveMisses: 0,
    };
    setGame(newGame);
    setSecretInput('');
    setHintInput('');
    setScreen('game');
    await syncGame(newGame);
  };

  const submitQuestion = async () => {
    if (!questionInput.trim() || !isMyTurn || pendingQ) return;
    const q = {
      id: Date.now(), askerId: viewerId, askerName: viewer.name,
      askerAvatarIdx: viewer.avatarIdx, text: questionInput.trim(), answer: null,
    };
    const newGame = { ...game, questions: [...game.questions, q] };
    setGame(newGame);
    setQuestionInput('');
    sounds.question();
    await syncGame(newGame);
  };

  const answerQ = async (ans, note = '') => {
    const questions = game.questions.map((q) => q.answer === null ? { ...q, answer: ans, note: note.trim() } : q);
    const newGame = { ...game, questions, currentQuestionerIndex: game.currentQuestionerIndex + 1, hostConsecutiveMisses: 0 };
    setGame(newGame);
    setPartlyMode(false);
    setPartlyNote('');
    if (ans === 'YES') sounds.yes();
    else if (ans === 'NO') sounds.no();
    else sounds.partly();
    await syncGame(newGame);
  };

  const submitSolve = async () => {
    if (!solveInput.trim()) return;
    setSolveModalOpen(false);
    const newGame = { ...game, pendingSolve: { playerId: viewerId, playerName: viewer.name, answer: solveInput.trim() } };
    setGame(newGame);
    setSolveInput('');
    sounds.solve();
    await syncGame(newGame);
  };

  const hostVerify = async (correct) => {
    if (correct) {
      await endRound(game.pendingSolve.playerId);
    } else {
      sounds.eliminated();
      const newGame = {
        ...game,
        players: game.players.map((p) => p.id === game.pendingSolve.playerId ? { ...p, isEliminated: true } : p),
        pendingSolve: null,
      };
      setGame(newGame);
      await syncGame(newGame);
    }
  };

  const endRound = async (winnerId, currentGame = game) => {
    const newGame = {
      ...currentGame, roundWinnerId: winnerId, status: 'round_end', pendingSolve: null,
      players: currentGame.players.map((p) => {
        if (winnerId && p.id === winnerId) return { ...p, score: p.score + 10 };
        if (!winnerId && p.isHost) return { ...p, score: p.score + 5 };
        return p;
      }),
    };
    setGame(newGame);
    setScreen('result');
    if (winnerId) sounds.win(); else sounds.hostWin();
    await syncGame(newGame);
  };

  const nextRound = async () => {
    // If the previous host abandoned, they've already been promoted-away — keep current host.
    // Otherwise rotate to the next player in order.
    let players;
    if (game.hostAbandoned) {
      players = game.players.map((p) => ({ ...p, isEliminated: false }));
    } else {
      const currHostIdx = game.players.findIndex((p) => p.isHost);
      const newHostIdx = (currHostIdx + 1) % game.players.length;
      players = game.players.map((p, i) => ({ ...p, isHost: i === newHostIdx, isEliminated: false }));
    }
    const newGame = {
      ...game, players, round: game.round + 1, theme: null, secretAnswer: '',
      hostHint: '', questions: [], currentQuestionerIndex: 0,
      status: 'theme_select', pendingSolve: null, roundWinnerId: undefined,
      hostConsecutiveMisses: 0, hostAbandoned: false, abandonedHostName: undefined,
    };
    setGame(newGame);
    setSelectedTheme(null);
    setScreen('theme');
    await syncGame(newGame);
  };

  // Remove the current viewer from the live session and update remote state
  // so the other players see the correct outcome.
  const leaveSession = async () => {
    if (!game || !viewerId) { setGame(null); setViewerId(null); setScreen('home'); return; }
    const me = game.players.find((p) => p.id === viewerId);
    const remaining = game.players.filter((p) => p.id !== viewerId);
    const roomCode = game.roomCode;
    const wasHost = !!me?.isHost;
    const wasPlaying = game.status === 'playing';

    // Clean local state immediately so the user sees Home right away
    setGame(null); setViewerId(null); setScreen('home');

    if (!me) return;

    try {
      // Last player out — close the room
      if (remaining.length === 0) {
        await supabase.from('sessions').delete().eq('room_code', roomCode);
        return;
      }

      // If host left, promote the next remaining player to host
      let players = remaining;
      let updated = { ...game, players };
      if (wasHost) {
        const newHostId = remaining[0].id;
        players = remaining.map((p) => p.id === newHostId ? { ...p, isHost: true, isEliminated: false } : p);
        if (wasPlaying) {
          // End this round: reveal secret, no winner, host gets no points
          updated = {
            ...game, players,
            status: 'round_end', roundWinnerId: null,
            hostAbandoned: true, abandonedHostName: me.name,
            pendingSolve: null, hostConsecutiveMisses: 0,
          };
        } else if (game.status === 'theme_select' || game.status === 'secret_entry') {
          // Reset back to lobby so the new host can pick fresh
          updated = {
            ...game, players,
            status: 'lobby', theme: null, secretAnswer: '', hostHint: '',
            questions: [], currentQuestionerIndex: 0, pendingSolve: null, hostConsecutiveMisses: 0,
          };
        } else {
          updated = { ...game, players };
        }
      }

      await supabase.from('sessions').upsert({
        room_code: roomCode, data: updated, is_public: !!updated.isPublic,
      });
    } catch {}
  };

  const goHome = () => {
    if (!game) { setScreen('home'); return; }
    const playing = game.status === 'playing';
    const iAmHost = !!viewer?.isHost;
    if (playing) {
      Alert.alert(
        'Leave Game',
        iAmHost
          ? 'As host, leaving will reveal the secret and end this round for everyone. Continue?'
          : 'Leave the game? The round will continue without you.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: leaveSession },
        ],
      );
    } else {
      leaveSession();
    }
  };

  const joinLink = game?.roomCode
    ? LinkingExpo.createURL('/', { queryParams: { join: game.roomCode } })
    : `enigma://join?code=${game?.roomCode}`;

  const SBar = () => game
    ? <SimBar players={game.players} viewerId={viewerId} onSwitch={setViewerId} onHome={goHome} topInset={insets.top} />
    : null;

  // ─── HOME ─────────────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <Modal visible={howToPlayOpen} animationType="slide" transparent onRequestClose={() => setHowToPlayOpen(false)}>
          <View style={S.overlay}>
            <View style={[S.modal, { maxHeight: '90%' }]}>
              <View style={S.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[S.modalTitle, { marginBottom: 16 }]}>📖 How to Play</Text>

                <Text style={S.sectionLabel}>🎯 Objective</Text>
                <Text style={S.bodyText}>
                  One player is the <Text style={{ color: C.text, fontFamily: 'Outfit_700Bold' }}>Host</Text> who picks a secret.
                  All other players are <Text style={{ color: C.text, fontFamily: 'Outfit_700Bold' }}>Guessers</Text> who must
                  figure out the secret by asking up to <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>20 questions</Text>.
                  The Host answers with <Text style={{ color: C.success, fontFamily: 'Outfit_700Bold' }}>Yes</Text>,{' '}
                  <Text style={{ color: C.danger, fontFamily: 'Outfit_700Bold' }}>No</Text>, or{' '}
                  <Text style={{ color: C.warn, fontFamily: 'Outfit_700Bold' }}>Partly</Text>.
                </Text>

                <Text style={[S.sectionLabel, { marginTop: 16 }]}>👥 The Roles</Text>
                <View style={S.infoCard}>
                  <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold', fontSize: 14, marginBottom: 4 }}>👑 The Host</Text>
                  <Text style={S.bodyText}>Selects a theme, thinks of a secret, and answers every question. A Partly answer can include a short note. The Host wins if nobody guesses correctly.</Text>
                </View>
                <View style={[S.infoCard, { marginTop: 8 }]}>
                  <Text style={{ color: C.violet2, fontFamily: 'Outfit_700Bold', fontSize: 14, marginBottom: 4 }}>🕵️ The Guessers</Text>
                  <Text style={S.bodyText}>Take turns asking one question at a time. All players can see every question and answer.</Text>
                </View>

                <Text style={[S.sectionLabel, { marginTop: 16 }]}>🔢 Question Limit</Text>
                <Text style={S.bodyText}>There are <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>20 questions total</Text>, shared equally among all guessers.</Text>

                <Text style={[S.sectionLabel, { marginTop: 16 }]}>💡 Solving the Secret</Text>
                <Text style={S.bodyText}>Any guesser can tap <Text style={{ color: C.violet2, fontFamily: 'Outfit_700Bold' }}>💡 Solve</Text> at any time. The Host decides if it's Correct or Wrong.</Text>

                <Text style={[S.sectionLabel, { marginTop: 16 }]}>🏆 Winning & Elimination</Text>
                <Text style={S.bodyText}>
                  {'• '}<Text style={{ color: C.success }}>Correct guess</Text>{' → Guesser wins, earns '}<Text style={{ color: C.gold }}>10 pts</Text>{'\n'}
                  {'• '}<Text style={{ color: C.danger }}>Wrong guess</Text>{' → Guesser eliminated\n'}
                  {'• All 20 questions used or all eliminated → '}<Text style={{ color: C.gold }}>Host wins, earns 5 pts</Text>
                </Text>

                <Text style={[S.sectionLabel, { marginTop: 16 }]}>🔄 Rounds</Text>
                <Text style={S.bodyText}>After each round the Host role rotates. Play as many rounds as you like!</Text>

                <TouchableOpacity style={[S.btnGold, { marginTop: 24, marginBottom: 8 }]} onPress={() => setHowToPlayOpen(false)}>
                  <Text style={S.btnGoldText}>Got it — Let's Play! ✦</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ fontSize: 52, marginBottom: 10 }}>🔍</Text>
            <Text style={{ fontFamily: 'Cinzel_900Black', fontSize: 32, letterSpacing: 6, color: C.gold }}>ENIGMA</Text>
            <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 4, textTransform: 'uppercase', marginTop: 6, fontFamily: 'Outfit_400Regular' }}>
              Reviving the Classic Art of 20 Questions
            </Text>
            <Text style={{ fontSize: 10, color: C.dim, fontFamily: 'Outfit_400Regular', marginTop: 10, letterSpacing: 1 }}>v1.9</Text>
          </View>

          <TouchableOpacity style={S.btnGold} onPress={() => setScreen('create')}>
            <Text style={S.btnGoldText}>✦  Create New Game</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.btnOutline, { marginTop: 10, borderColor: 'rgba(200,168,74,0.4)', backgroundColor: 'rgba(200,168,74,0.05)' }]}
            onPress={openDailyChallenge}
          >
            <Text style={[S.btnOutlineText, { color: C.gold }]}>📅  Daily Challenge</Text>
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            style={[S.btnOutline, { borderColor: 'rgba(167,139,250,0.45)', backgroundColor: 'rgba(109,40,217,0.08)' }]}
            onPress={() => { loadPublicRooms(); setScreen('rooms'); }}
          >
            <Text style={[S.btnOutlineText, { color: C.violet2 }]}>🌐  Browse Public Rooms</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[S.btnOutline, { marginTop: 12 }]} onPress={() => setScreen('join')}>
            <Text style={S.btnOutlineText}>Join with a Code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[S.btnOutline, { marginTop: 24, borderColor: 'rgba(200,168,74,0.3)' }]} onPress={() => setHowToPlayOpen(true)}>
            <Text style={[S.btnOutlineText, { color: C.gold }]}>📖  How to Play</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────
  if (screen === 'create') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={S.backBtn}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={S.h2}>Create Game</Text>
          <Text style={[S.muted, { marginBottom: 24 }]}>You'll be the first host this round.</Text>
          <Text style={S.fieldLabel}>Your Name</Text>
          <TextInput
            style={S.input} placeholder="Enter your name..." placeholderTextColor={C.dim}
            value={nameInput} onChangeText={setNameInput} maxLength={20}
            autoFocus onSubmitEditing={createGame} returnKeyType="go"
          />
          <AvatarPicker selected={selectedAvatarIdx} onSelect={setSelectedAvatarIdx} />

          <Text style={S.fieldLabel}>Room Visibility</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => setIsPublicRoom(false)}
              style={[S.visTile, !isPublicRoom && S.visTileSel]}
            >
              <Text style={{ fontSize: 22, marginBottom: 6 }}>🔒</Text>
              <Text style={[S.visTileTitle, !isPublicRoom && { color: C.gold }]}>Private</Text>
              <Text style={S.visTileDesc}>Share a code or QR with friends</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsPublicRoom(true)}
              style={[S.visTile, isPublicRoom && S.visTileSel]}
            >
              <Text style={{ fontSize: 22, marginBottom: 6 }}>🌐</Text>
              <Text style={[S.visTileTitle, isPublicRoom && { color: C.gold }]}>Public</Text>
              <Text style={S.visTileDesc}>Anyone can find and join this room</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[S.btnGold, !nameInput.trim() && S.btnDisabled]} onPress={createGame} disabled={!nameInput.trim()}>
            <Text style={S.btnGoldText}>Create Room →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── JOIN ─────────────────────────────────────────────────────────────────
  if (screen === 'join') {
    const joinReady = codeInput.length === 6 && nameInput.trim();
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={S.backBtn}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={S.h2}>Join Game</Text>
          <Text style={[S.muted, { marginBottom: 24 }]}>Get the room code from your host.</Text>
          <Text style={S.fieldLabel}>Room Code</Text>
          <TextInput
            style={[S.input, { textAlign: 'center', fontFamily: 'Cinzel_700Bold', fontSize: 28, letterSpacing: 8, color: C.gold }]}
            placeholder="XXXXXX" placeholderTextColor={C.dim}
            value={codeInput} onChangeText={(t) => setCodeInput(t.toUpperCase())}
            maxLength={6} autoCapitalize="characters" autoFocus
          />
          <Text style={[S.fieldLabel, { marginTop: 16 }]}>Your Name</Text>
          <TextInput
            style={S.input} placeholder="Enter your name..." placeholderTextColor={C.dim}
            value={nameInput} onChangeText={setNameInput}
            maxLength={20} onSubmitEditing={joinGame} returnKeyType="go"
          />
          <AvatarPicker selected={selectedAvatarIdx} onSelect={setSelectedAvatarIdx} />
          <TouchableOpacity style={[S.btnGold, !joinReady && S.btnDisabled]} onPress={joinGame} disabled={!joinReady}>
            <Text style={S.btnGoldText}>Join →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── PUBLIC ROOMS BROWSER ─────────────────────────────────────────────────
  if (screen === 'rooms') {
    const readyToJoin = !!nameInput.trim();
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={S.backBtn}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={loadPublicRooms} disabled={loadingRooms}>
              <Text style={{ fontSize: 13, color: loadingRooms ? C.dim : C.violet2, fontFamily: 'Outfit_600SemiBold' }}>
                {loadingRooms ? 'Refreshing…' : '↻ Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={S.h2}>Public Rooms</Text>
          <Text style={[S.muted, { marginBottom: 18 }]}>Jump into a room that's waiting for players.</Text>

          <Text style={S.fieldLabel}>Your Name</Text>
          <TextInput
            style={S.input} placeholder="Enter your name..." placeholderTextColor={C.dim}
            value={nameInput} onChangeText={setNameInput} maxLength={20}
          />
          <AvatarPicker selected={selectedAvatarIdx} onSelect={setSelectedAvatarIdx} />

          {loadingRooms && publicRooms.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>⏳</Text>
              <Text style={S.muted}>Looking for open rooms…</Text>
            </View>
          ) : publicRooms.length === 0 ? (
            <View style={[S.card, { alignItems: 'center', paddingVertical: 28 }]}>
              <Text style={{ fontSize: 38, marginBottom: 10 }}>🪐</Text>
              <Text style={[S.h2, { textAlign: 'center', fontSize: 16, marginBottom: 6 }]}>No open rooms right now</Text>
              <Text style={[S.muted, { textAlign: 'center', marginBottom: 14 }]}>Be the first — create a public room and friends can join from here.</Text>
              <TouchableOpacity style={S.btnOutlineSm} onPress={() => { setIsPublicRoom(true); setScreen('create'); }}>
                <Text style={S.btnOutlineSmText}>+ Create Public Room</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[S.fieldLabel, { marginTop: 4 }]}>{publicRooms.length} open room{publicRooms.length !== 1 ? 's' : ''}</Text>
              {publicRooms.map((r) => {
                const a = av(r.hostAvatarIdx);
                const full = r.playerCount >= 8;
                return (
                  <TouchableOpacity
                    key={r.roomCode}
                    style={[S.roomRow, full && { opacity: 0.5 }]}
                    onPress={() => !full && readyToJoin && joinPublicRoom(r.roomCode)}
                    disabled={full || !readyToJoin}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: C.text }}>{r.hostName}'s room</Text>
                      <Text style={{ fontSize: 11, color: C.dim, fontFamily: 'Outfit_400Regular', marginTop: 2 }}>
                        Code {r.roomCode} · {r.playerCount} player{r.playerCount !== 1 ? 's' : ''} waiting
                      </Text>
                    </View>
                    {full ? (
                      <View style={S.badgeGuesser}>
                        <Text style={S.badgeGuesserText}>Full</Text>
                      </View>
                    ) : (
                      <Text style={{ color: C.gold, fontSize: 22, fontFamily: 'Outfit_400Regular' }}>›</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              {!readyToJoin && (
                <Text style={[S.muted, { textAlign: 'center', marginTop: 10, fontSize: 12 }]}>Enter your name above to join a room.</Text>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── DAILY CHALLENGE ──────────────────────────────────────────────────────
  if (screen === 'daily' && dailyChallengeData) {
    const { theme, item } = dailyChallengeData;
    const qCount = dailyQuestions.length;
    const hasGeminiKey = !!Constants.expoConfig?.extra?.geminiApiKey;

    // ── Intro ──
    if (dailyPhase === 'intro') {
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
          <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
            <View style={S.screenHeader}>
              <TouchableOpacity onPress={() => setScreen('home')}>
                <Text style={S.backBtn}>← Back</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: C.dim, fontFamily: 'Outfit_400Regular', letterSpacing: 2 }}>
                {dailyChallengeData.date}
              </Text>
            </View>

            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ fontSize: 64, marginBottom: 10 }}>📅</Text>
              <Text style={{ fontFamily: 'Cinzel_900Black', fontSize: 22, letterSpacing: 4, color: C.gold }}>DAILY CHALLENGE</Text>
              <Text style={{ fontSize: 12, color: C.dim, fontFamily: 'Outfit_400Regular', marginTop: 6, letterSpacing: 2 }}>
                A new secret every day · Same for everyone
              </Text>
            </View>

            <View style={{ backgroundColor: 'rgba(200,168,74,0.07)', borderWidth: 1, borderColor: C.goldDim, borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 44, marginBottom: 8 }}>{theme.icon}</Text>
              <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Outfit_400Regular', marginBottom: 4 }}>Today's Category</Text>
              <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 20, color: C.text }}>{theme.label}</Text>
              <Text style={{ fontSize: 12, color: C.muted, fontFamily: 'Outfit_400Regular', marginTop: 6, textAlign: 'center' }}>{theme.desc}</Text>
            </View>

            {!hasGeminiKey && (
              <View style={{ backgroundColor: 'rgba(240,160,48,0.08)', borderWidth: 1, borderColor: 'rgba(240,160,48,0.3)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: C.warn, fontFamily: 'Outfit_400Regular', textAlign: 'center' }}>
                  ⚠️ Gemini API key not set — questions will receive placeholder answers. Add your key to app.json to enable AI responses.
                </Text>
              </View>
            )}

            <Text style={S.fieldLabel}>Your Name</Text>
            <TextInput
              style={S.input} placeholder="Enter your name..." placeholderTextColor={C.dim}
              value={nameInput} onChangeText={setNameInput} maxLength={20}
            />
            <AvatarPicker selected={selectedAvatarIdx} onSelect={setSelectedAvatarIdx} />

            <TouchableOpacity
              style={[S.btnGold, !nameInput.trim() && S.btnDisabled]}
              disabled={!nameInput.trim()}
              onPress={() => setDailyPhase('game')}
            >
              <Text style={S.btnGoldText}>Start Challenge →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center', padding: 8 }} onPress={() => { loadDailyLeaderboard(dailyChallengeData.date); setDailyPhase('result'); setDailyResult(null); }}>
              <Text style={{ fontSize: 13, color: C.dim, fontFamily: 'Outfit_400Regular' }}>View today's leaderboard →</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    // ── Game ──
    if (dailyPhase === 'game') {
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
          {/* Solve modal */}
          <Modal visible={dailySolveOpen} transparent animationType="slide" onRequestClose={() => setDailySolveOpen(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
              <View style={S.overlay}>
                <View style={S.modal}>
                  <View style={S.modalHandle} />
                  <Text style={S.modalTitle}>💡 Make Your Guess</Text>
                  <Text style={[S.modalSub, { marginBottom: 14 }]}>What's the secret {theme.label.toLowerCase()}?</Text>
                  <TextInput
                    style={S.input} placeholder={`e.g. "Nikola Tesla"...`} placeholderTextColor={C.dim}
                    value={dailySolveInput} onChangeText={setDailySolveInput}
                    autoFocus onSubmitEditing={submitDailyGuess} returnKeyType="done"
                  />
                  <TouchableOpacity style={[S.btnGold, !dailySolveInput.trim() && S.btnDisabled]} onPress={submitDailyGuess} disabled={!dailySolveInput.trim()}>
                    <Text style={S.btnGoldText}>Submit Guess →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ marginTop: 10, alignItems: 'center', padding: 8 }} onPress={() => setDailySolveOpen(false)}>
                    <Text style={{ color: C.dim, fontSize: 13, fontFamily: 'Outfit_400Regular' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          <View style={{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border2, paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>📅</Text>
              <View>
                <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 13, color: C.gold }}>Daily Challenge</Text>
                <Text style={{ fontSize: 11, color: C.muted, fontFamily: 'Outfit_400Regular' }}>{theme.icon} {theme.label}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 18, color: qCount >= 16 ? C.danger : qCount >= 11 ? C.warn : C.gold }}>{qCount}</Text>
              <Text style={{ fontSize: 10, color: C.dim, fontFamily: 'Outfit_400Regular' }}>of 20</Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
            {qCount === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>🤔</Text>
                <Text style={[S.muted, { textAlign: 'center', lineHeight: 20 }]}>
                  Ask yes/no questions to uncover{'\n'}today's {theme.label.toLowerCase()}.
                </Text>
                <Text style={[S.muted, { marginTop: 8, fontSize: 12, color: C.dim }]}>Hint: {item.hint}</Text>
              </View>
            ) : (
              dailyQuestions.map((q) => (
                <View key={q.id} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 12, color: C.muted, fontFamily: 'Outfit_700Bold' }}>Q</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 14, color: C.text, fontFamily: 'Outfit_500Medium', paddingTop: 3 }}>{q.text}</Text>
                  </View>
                  <View style={{ marginLeft: 34, marginTop: 6 }}>
                    {q.answer === 'PARTLY' ? (
                      <View style={[S.qBadge, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                        <Text style={{ color: C.warn, fontSize: 13, fontFamily: 'Outfit_700Bold' }}>~ Partly{q.note ? ` — ${q.note}` : ''}</Text>
                      </View>
                    ) : (
                      <View style={[S.qBadge, { backgroundColor: q.answer === 'YES' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderColor: q.answer === 'YES' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }]}>
                        <Text style={{ color: q.answer === 'YES' ? C.success : C.danger, fontSize: 13, fontFamily: 'Outfit_700Bold' }}>
                          {q.answer === 'YES' ? '✓ Yes' : '✗ No'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
            {dailyAsking && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: C.card2, borderRadius: 10, borderWidth: 1, borderColor: C.border2 }}>
                <Text style={{ fontSize: 16 }}>⏳</Text>
                <Text style={{ fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular' }}>Thinking…</Text>
              </View>
            )}
          </ScrollView>

          <View style={{ padding: 12, paddingBottom: insets.bottom + 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TextInput
                style={[S.input, { flex: 1, marginBottom: 0, paddingVertical: 12 }]}
                placeholder="Ask a yes/no question…" placeholderTextColor={C.dim}
                value={dailyInput} onChangeText={setDailyInput}
                onSubmitEditing={submitDailyQuestion} returnKeyType="send"
                editable={!dailyAsking && qCount < 20}
              />
              <TouchableOpacity
                style={[S.btnGold, { width: 'auto', paddingHorizontal: 18, borderRadius: 10 }, (!dailyInput.trim() || dailyAsking) && S.btnDisabled]}
                onPress={submitDailyQuestion} disabled={!dailyInput.trim() || dailyAsking}
              >
                <Text style={S.btnGoldText}>Ask</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={S.btnSolve} onPress={() => { setDailySolveInput(''); setDailySolveOpen(true); }}>
              <Text style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 }}>💡 I Know It — Solve!</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      );
    }

    // ── Result ──
    if (dailyPhase === 'result') {
      const rating = dailyResult ? dailyStars(dailyResult.questionsUsed, dailyResult.solved) : null;
      return (
        <ScrollView style={[S.flex, { backgroundColor: C.bg }]} contentContainerStyle={[S.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}><Text style={S.backBtn}>← Home</Text></TouchableOpacity>
          </View>

          {dailyResult ? (
            <>
              <View style={{ alignItems: 'center', padding: 28, backgroundColor: dailyResult.solved ? 'rgba(200,168,74,0.06)' : 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: dailyResult.solved ? C.goldDim : 'rgba(239,68,68,0.3)', borderRadius: 20, marginBottom: 16 }}>
                <Text style={{ fontSize: 52, marginBottom: 8 }}>{dailyResult.solved ? '🏆' : '💀'}</Text>
                <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 22, color: dailyResult.solved ? C.gold : C.danger, marginBottom: 4 }}>
                  {dailyResult.solved ? `Solved in ${dailyResult.questionsUsed} question${dailyResult.questionsUsed !== 1 ? 's' : ''}!` : 'Not solved today'}
                </Text>
                {rating && <Text style={{ fontSize: 14, color: C.muted, fontFamily: 'Outfit_600SemiBold', marginTop: 4 }}>{rating.label}</Text>}
              </View>

              <View style={{ backgroundColor: 'rgba(109,40,217,0.08)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Outfit_400Regular' }}>The Secret Was</Text>
                <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 20, color: C.violet2 }}>{item.secret}</Text>
                <Text style={{ fontSize: 12, color: C.dim, marginTop: 4, fontFamily: 'Outfit_400Regular' }}>{theme.icon} {theme.label}</Text>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 52, marginBottom: 8 }}>📅</Text>
              <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 18, color: C.gold, marginBottom: 4 }}>Today's Leaderboard</Text>
              <Text style={[S.muted, { textAlign: 'center' }]}>{theme.icon} {theme.label}</Text>
            </View>
          )}

          <View style={S.card}>
            <Text style={S.cardTitle}>Today's Top Players</Text>
            {dailyLoadingBoard ? (
              <Text style={[S.muted, { textAlign: 'center', padding: 12 }]}>Loading…</Text>
            ) : dailyLeaderboard.length === 0 ? (
              <Text style={[S.muted, { textAlign: 'center', padding: 12 }]}>No scores yet today — be the first!</Text>
            ) : (
              dailyLeaderboard.map((entry, i) => {
                const a = av(entry.avatar_idx);
                const isMe = entry.player_name === (nameInput.trim() || 'Anonymous');
                return (
                  <View key={i} style={[S.sbRow, i === 0 && S.sbRowFirst, isMe && { borderColor: C.violet2 }]}>
                    <Text style={[S.sbRank, i === 0 && { color: C.gold }]}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</Text>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>{a.emoji}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, fontFamily: isMe ? 'Outfit_700Bold' : 'Outfit_500Medium', color: isMe ? C.violet2 : C.text }}>
                      {entry.player_name}{isMe ? ' (You)' : ''}
                    </Text>
                    <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 16, color: C.gold }}>{entry.questions}Q</Text>
                  </View>
                );
              })
            )}
          </View>

          <TouchableOpacity style={[S.btnGold, { marginTop: 8 }]} onPress={openDailyChallenge}>
            <Text style={S.btnGoldText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.btnOutline, { marginTop: 10 }]} onPress={() => setScreen('home')}>
            <Text style={S.btnOutlineText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
  }

  if (!game) return null;

  // ─── LOBBY ────────────────────────────────────────────────────────────────
  if (screen === 'lobby') {
    return (
      <View style={[S.flex, { backgroundColor: C.bg }]}>
        <SBar />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 90 }]}>
          <View style={S.screenHeader}>
            <Chip label="Lobby" />
            <Text style={{ fontSize: 12, color: C.dim, fontFamily: 'Outfit_400Regular' }}>
              {game.players.length} player{game.players.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Room code + QR */}
          {game.isPublic ? (
            <View style={{
              backgroundColor: 'rgba(109,40,217,0.08)', borderWidth: 1,
              borderColor: 'rgba(109,40,217,0.4)', borderRadius: 16,
              padding: 20, alignItems: 'center', marginVertical: 14,
            }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🌐</Text>
              <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 16, color: C.violet2, marginBottom: 4 }}>
                Room is Public
              </Text>
              <Text style={{ fontSize: 12, color: C.muted, fontFamily: 'Outfit_400Regular', textAlign: 'center', lineHeight: 18, marginBottom: 14 }}>
                Your room is listed in the public browser.{'\n'}Anyone can find and join while you wait here.
              </Text>
              <View style={{ height: 1, backgroundColor: C.border2, width: '100%', marginBottom: 14 }} />
              <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'Outfit_400Regular' }}>
                Or share directly
              </Text>
              <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 30, color: C.gold, letterSpacing: 8, marginBottom: 4 }}>
                {game.roomCode}
              </Text>
              <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 8, marginTop: 8 }}>
                <QRCode
                  value={joinLink || `enigma://join?code=${game.roomCode}`}
                  size={110} backgroundColor="#ffffff" color="#06060f"
                />
              </View>
            </View>
          ) : (
            <View style={S.codeBox}>
              <Text style={S.codeBoxLabel}>Room Code</Text>
              <Text style={S.codeBoxValue}>{game.roomCode}</Text>
              <Text style={S.codeBoxSub}>Share this code or scan QR to join</Text>
              <View style={{ marginTop: 16, alignItems: 'center' }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 10 }}>
                  <QRCode
                    value={joinLink || `enigma://join?code=${game.roomCode}`}
                    size={140} backgroundColor="#ffffff" color="#06060f"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Players */}
          <View style={S.card}>
            <Text style={S.cardTitle}>Players</Text>
            {game.players.map((p) => (
              <View key={p.id} style={S.playerItem}>
                <PlayerAvatar p={p} />
                <Text style={[S.playerName, { flex: 1 }]}>
                  {p.name}{p.id === viewerId ? <Text style={{ color: C.dim, fontSize: 11 }}> (You)</Text> : ''}
                </Text>
                <View style={p.isHost ? S.badgeHost : S.badgeGuesser}>
                  <Text style={p.isHost ? S.badgeHostText : S.badgeGuesserText}>
                    {p.isHost ? '👑 Host' : 'Guesser'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Demo players */}
          <View style={[S.card, { borderColor: 'rgba(109,40,217,0.3)' }]}>
            <Text style={[S.cardTitle, { color: C.violet2 }]}>⚡ Simulate Friends Joining</Text>
            <Text style={[S.bodyText, { marginBottom: 12 }]}>Tap to add demo players (simulates friends joining via code)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DEMO_PLAYERS.filter((dp) => !game.players.find((p) => p.name === dp.name)).map((dp) => (
                <TouchableOpacity key={dp.name} style={S.btnOutlineSm} onPress={() => addDemoPlayer(dp)}>
                  <Text style={S.btnOutlineSmText}>+ {dp.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {viewerIsHost && (
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: 16, paddingBottom: insets.bottom + 16,
            backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
          }}>
            {game.players.length >= 2
              ? <TouchableOpacity style={S.btnGold} onPress={startGame}><Text style={S.btnGoldText}>Start Game →</Text></TouchableOpacity>
              : <Text style={[S.muted, { textAlign: 'center' }]}>Need at least 2 players to start</Text>
            }
          </View>
        )}
      </View>
    );
  }

  // ─── THEME SELECT ─────────────────────────────────────────────────────────
  if (screen === 'theme') {
    return (
      <View style={[S.flex, { backgroundColor: C.bg }]}>
        <SBar />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <Chip label={`Round ${game.round}`} />
            <Text style={{ fontSize: 12, color: C.muted, fontFamily: 'Outfit_400Regular' }}>Host: {host?.name}</Text>
          </View>

          {viewerIsHost ? (
            <>
              <Text style={S.h2}>Choose a Theme</Text>
              <Text style={[S.muted, { marginBottom: 18 }]}>Your secret must fit within this category.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                {THEMES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[S.themeTile, selectedTheme?.id === t.id && S.themeTileSel]}
                    onPress={() => setSelectedTheme(t)}
                  >
                    <Text style={{ fontSize: 26, marginBottom: 7 }}>{t.icon}</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: C.text, textAlign: 'center', lineHeight: 16 }}>{t.label}</Text>
                    <Text style={{ fontSize: 10, color: C.muted, marginTop: 4, textAlign: 'center', lineHeight: 14, fontFamily: 'Outfit_400Regular' }}>{t.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[S.btnGold, !selectedTheme && S.btnDisabled]} onPress={confirmTheme} disabled={!selectedTheme}>
                <Text style={S.btnGoldText}>Continue →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 60, marginBottom: 16 }}>⏳</Text>
              <Text style={[S.h2, { textAlign: 'center', marginBottom: 8 }]}>Host is choosing...</Text>
              <Text style={[S.muted, { textAlign: 'center', marginBottom: 28 }]}>The host is selecting a theme. Prepare your mind.</Text>
              <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border2, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 28, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: C.dim, letterSpacing: 2, marginBottom: 4, fontFamily: 'Outfit_400Regular' }}>HOST THIS ROUND</Text>
                <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 20, color: C.gold }}>{host?.name}</Text>
              </View>
              <Text style={{ fontSize: 11, color: C.dim, marginTop: 20, fontFamily: 'Outfit_400Regular' }}>
                Switch to host in the bar above to proceed
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── SECRET ENTRY ─────────────────────────────────────────────────────────
  if (screen === 'secret') {
    const themeLibrary = CONTENT_LIBRARY[game.theme?.id] || [];

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <SBar />

        {/* Host Briefing Modal — private facts revealed after picking a library secret */}
        <Modal visible={!!libraryBriefing} transparent animationType="slide" onRequestClose={() => setLibraryBriefing(null)}>
          <View style={S.overlay}>
            <View style={[S.modal, { maxHeight: '85%' }]}>
              <View style={S.modalHandle} />
              <View style={{ backgroundColor: 'rgba(200,168,74,0.08)', borderWidth: 1, borderColor: C.goldDim, borderRadius: 10, padding: 10, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13 }}>🔒</Text>
                <Text style={{ fontSize: 11, color: C.goldDim, fontFamily: 'Outfit_700Bold', letterSpacing: 1.5 }}>PRIVATE — HOST EYES ONLY</Text>
              </View>
              <Text style={[S.modalTitle, { fontSize: 22, marginBottom: 2 }]}>{libraryBriefing?.secret}</Text>
              <Text style={[S.modalSub, { marginBottom: 14 }]}>Read these facts so you can answer questions confidently.</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {(libraryBriefing?.facts || []).map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold', fontSize: 14, marginTop: 1 }}>•</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular', lineHeight: 20 }}>{f}</Text>
                  </View>
                ))}
                {libraryBriefing?.hint ? (
                  <View style={{ backgroundColor: 'rgba(109,40,217,0.08)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.3)', borderRadius: 10, padding: 12, marginTop: 6 }}>
                    <Text style={{ fontSize: 10, color: C.violet2, letterSpacing: 2, fontFamily: 'Outfit_700Bold', marginBottom: 4 }}>HINT TO GUESSERS</Text>
                    <Text style={{ fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular' }}>{libraryBriefing.hint}</Text>
                  </View>
                ) : null}
              </ScrollView>
              <TouchableOpacity
                style={S.btnGold}
                onPress={() => { const item = libraryBriefing; setLibraryBriefing(null); lockSecret(item.secret, item.hint || ''); }}
              >
                <Text style={S.btnGoldText}>I'm Ready — Start Round →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 10, alignItems: 'center', padding: 8 }} onPress={() => setLibraryBriefing(null)}>
                <Text style={{ color: C.dim, fontSize: 13, fontFamily: 'Outfit_400Regular' }}>← Choose a different secret</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <Chip label={`${game.theme?.icon} ${game.theme?.label}`} style="violet" />
          </View>

          {viewerIsHost ? (
            <>
              <Text style={S.h2}>Choose Your Secret</Text>

              {/* Source tabs */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                <TouchableOpacity
                  style={[{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
                    secretSource === 'library'
                      ? { backgroundColor: 'rgba(200,168,74,0.12)', borderColor: C.goldDim }
                      : { backgroundColor: C.card, borderColor: C.border2 }]}
                  onPress={() => setSecretSource('library')}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: secretSource === 'library' ? C.gold : C.muted }}>📚 From Library</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
                    secretSource === 'manual'
                      ? { backgroundColor: 'rgba(200,168,74,0.12)', borderColor: C.goldDim }
                      : { backgroundColor: C.card, borderColor: C.border2 }]}
                  onPress={() => setSecretSource('manual')}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: secretSource === 'manual' ? C.gold : C.muted }}>✏️ Write My Own</Text>
                </TouchableOpacity>
              </View>

              {secretSource === 'library' ? (
                <>
                  <Text style={[S.muted, { marginBottom: 14 }]}>Pick a secret — you'll get private facts to help you answer questions confidently.</Text>
                  {themeLibrary.map((item, i) => (
                    <TouchableOpacity
                      key={i}
                      style={{ backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                      onPress={() => setLibraryBriefing(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: C.text, marginBottom: 3 }}>{item.secret}</Text>
                        <Text style={{ fontSize: 12, color: C.muted, fontFamily: 'Outfit_400Regular' }}>{item.hint}</Text>
                      </View>
                      <Text style={{ color: C.gold, fontSize: 22, fontFamily: 'Outfit_400Regular' }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <>
                  <Text style={[S.muted, { marginBottom: 18 }]}>Think of something within the theme. Guessers must unravel it.</Text>
                  <Text style={S.fieldLabel}>Secret Answer</Text>
                  <TextInput
                    style={S.input}
                    placeholder={`e.g. "Nikola Tesla", "The Magna Carta"...`}
                    placeholderTextColor={C.dim}
                    value={secretInput} onChangeText={setSecretInput} autoFocus
                  />
                  <Text style={[S.fieldLabel, { marginTop: 8 }]}>Optional Hint (visible to guessers)</Text>
                  <TextInput
                    style={S.input}
                    placeholder='e.g. "A scientist from the 19th century"'
                    placeholderTextColor={C.dim}
                    value={hintInput} onChangeText={setHintInput}
                  />
                  <View style={{ backgroundColor: 'rgba(245,158,11,0.07)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 10, padding: 12, marginVertical: 10 }}>
                    <Text style={{ fontSize: 12, color: C.warn, fontFamily: 'Outfit_400Regular' }}>🔒 Your answer is hidden until the round ends.</Text>
                  </View>
                  <TouchableOpacity style={[S.btnGold, !secretInput.trim() && S.btnDisabled]} onPress={() => lockSecret()} disabled={!secretInput.trim()}>
                    <Text style={S.btnGoldText}>Lock it in → Start Round</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 60, marginBottom: 16 }}>🤫</Text>
              <Text style={[S.h2, { textAlign: 'center', marginBottom: 8 }]}>Host is choosing their secret...</Text>
              <Text style={[S.muted, { textAlign: 'center' }]}>Stay sharp. The questioning begins soon.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── GAME ─────────────────────────────────────────────────────────────────
  if (screen === 'game') {
    const qLeft = 20 - answeredQs;
    const canAsk = !viewerIsHost && !viewerIsEliminated && isMyTurn && !pendingQ;

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <SBar />

        {/* Timeout toast — centred */}
        {timeoutToast && (
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 999, pointerEvents: 'none' }}>
            <View style={{ marginHorizontal: 28, backgroundColor: 'rgba(8,8,24,0.97)', borderWidth: 2, borderColor: C.gold, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 17, color: C.gold, textAlign: 'center', lineHeight: 25 }}>{timeoutToast}</Text>
            </View>
          </View>
        )}

        {/* Host warning modal — appears when 15s expires, gives 10s to answer */}
        <Modal visible={!!hostWarningData && viewerIsHost} transparent animationType="fade" onRequestClose={() => {}}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <View style={{ backgroundColor: C.surface, borderWidth: 2, borderColor: C.danger, borderRadius: 20, padding: 24, width: '100%' }}>
              <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 19, color: C.danger, textAlign: 'center', marginBottom: 4 }}>⏰ Answer Now!</Text>
              <Text style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 16, fontFamily: 'Outfit_400Regular' }}>
                {(game?.hostConsecutiveMisses || 0) === 0
                  ? 'Miss 1 of 2 — answer or the question will be skipped'
                  : '⚠️ Miss 2 of 2 — answer or you will be eliminated as host!'}
              </Text>
              <View style={{ alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 44, color: hostWarningSecsLeft <= 4 ? C.danger : C.warn }}>{hostWarningSecsLeft}</Text>
                <View style={{ height: 4, width: '100%', backgroundColor: C.border2, borderRadius: 2, marginTop: 4 }}>
                  <View style={{ height: 4, width: `${(hostWarningSecsLeft / 10) * 100}%`, backgroundColor: hostWarningSecsLeft <= 4 ? C.danger : C.warn, borderRadius: 2 }} />
                </View>
              </View>
              <View style={{ backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 2, marginBottom: 4, fontFamily: 'Outfit_700Bold' }}>QUESTION</Text>
                <Text style={{ fontSize: 15, color: C.text, fontFamily: 'Outfit_400Regular', lineHeight: 22 }}>{hostWarningData?.question}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[S.btnYes, { flex: 1 }]} onPress={() => { setHostWarningData(null); answerQ('YES'); }}>
                  <Text style={{ color: C.success, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>✓ YES</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.btnPartly, { flex: 1 }]} onPress={() => { setHostWarningData(null); answerQ('PARTLY'); }}>
                  <Text style={{ color: C.warn, fontFamily: 'Outfit_700Bold', fontSize: 13 }}>~ PARTLY</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.btnNo, { flex: 1 }]} onPress={() => { setHostWarningData(null); answerQ('NO'); }}>
                  <Text style={{ color: C.danger, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>✗ NO</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Host verify modal */}
        <Modal visible={!!(game.pendingSolve && viewerIsHost)} transparent animationType="slide" onRequestClose={() => {}}>
          <View style={S.overlay}>
            <View style={S.modal}>
              <View style={S.modalHandle} />
              <Text style={S.modalTitle}>Verify Guess</Text>
              <Text style={S.modalSub}>{game.pendingSolve?.playerName} thinks they cracked it!</Text>
              <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontSize: 11, color: C.dim, letterSpacing: 1, marginBottom: 4, fontFamily: 'Outfit_400Regular' }}>THEIR GUESS</Text>
                <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 22, color: C.gold }}>{game.pendingSolve?.answer}</Text>
                {game.pendingSolve && (() => {
                  const looks = fuzzyMatch(game.pendingSolve.answer, game.secretAnswer);
                  return (
                    <View style={{ marginTop: 8, backgroundColor: looks ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, color: looks ? C.success : C.danger, fontFamily: 'Outfit_400Regular' }}>
                        {looks ? '🤖 Looks correct' : '🤖 Looks wrong'} — but you decide!
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <View style={{ backgroundColor: 'rgba(109,40,217,0.08)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Outfit_400Regular' }}>Actual Secret</Text>
                <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 20, color: C.violet2 }}>{game.secretAnswer}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[S.btnNo, { flex: 1 }]} onPress={() => hostVerify(false)}>
                  <Text style={{ color: C.danger, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>✗ Wrong</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.btnYes, { flex: 1 }]} onPress={() => hostVerify(true)}>
                  <Text style={{ color: C.success, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>✓ Correct!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Waiting modal (guesser sees pending solve) */}
        <Modal visible={!!(game.pendingSolve && !viewerIsHost)} transparent animationType="slide" onRequestClose={() => {}}>
          <View style={S.overlay}>
            <View style={S.modal}>
              <View style={S.modalHandle} />
              <View style={{ alignItems: 'center', paddingVertical: 10, paddingBottom: 4 }}>
                <Text style={{ fontSize: 52, marginBottom: 12 }}>⚖️</Text>
                <Text style={S.modalTitle}>Host is deciding...</Text>
                <Text style={S.modalSub}>{game.pendingSolve?.playerName} submitted an answer — waiting for the verdict.</Text>
                <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 16, width: '100%', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, color: C.dim, letterSpacing: 1, marginBottom: 6, fontFamily: 'Outfit_400Regular' }}>ANSWER SUBMITTED</Text>
                  <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 22, color: C.gold }}>{game.pendingSolve?.answer}</Text>
                </View>
                <TouchableOpacity
                  style={[S.btnGold, { alignSelf: 'stretch' }]}
                  onPress={() => setViewerId(game.players.find(p => p.isHost)?.id)}
                >
                  <Text style={S.btnGoldText}>👑 Switch to Host to Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Solve modal */}
        <Modal visible={solveModalOpen} transparent animationType="slide" onRequestClose={() => setSolveModalOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSolveModalOpen(false)} />
            <View style={S.modal}>
              <View style={S.modalHandle} />
              <Text style={S.modalTitle}>Make Your Guess</Text>
              <Text style={S.modalSub}>Be confident — a wrong guess eliminates you from the round!</Text>
              <TextInput
                style={[S.input, { marginBottom: 12 }]}
                placeholder="Type your answer..." placeholderTextColor={C.dim}
                value={solveInput} onChangeText={setSolveInput}
                autoFocus onSubmitEditing={submitSolve} returnKeyType="done"
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[S.btnOutline, { flex: 1, paddingVertical: 14 }]} onPress={() => setSolveModalOpen(false)}>
                  <Text style={S.btnOutlineText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.btnSolve, { flex: 1 }, !solveInput.trim() && S.btnDisabled]} onPress={submitSolve} disabled={!solveInput.trim()}>
                  <Text style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 }}>Submit Guess</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Game content */}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {/* Top bar — Round top-right, Category centered, Hint below */}
          <View style={{ paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
              <View style={{ backgroundColor: 'rgba(200,168,74,0.14)', borderWidth: 1, borderColor: C.goldDim, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 }}>
                <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 13, color: C.gold }}>Round {game.round}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 22, color: C.violet2, textAlign: 'center' }}>
                {game.theme?.icon}{'  '}{game.theme?.label}
              </Text>
            </View>
            {game.hostHint ? (
              <View style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: C.warn, letterSpacing: 2, marginBottom: 4, fontFamily: 'Outfit_700Bold' }}>💡 HINT</Text>
                <Text style={{ fontSize: 15, color: C.text, fontFamily: 'Outfit_500Medium', textAlign: 'center' }}>{game.hostHint}</Text>
              </View>
            ) : null}
          </View>

          {/* Progress bar */}
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 14, color: C.muted, fontFamily: 'Outfit_600SemiBold' }}>Questions Remaining</Text>
              <Text style={{ fontSize: 14, color: qLeft <= 5 ? C.danger : C.gold, fontFamily: 'Outfit_700Bold' }}>{qLeft} / 20</Text>
            </View>
            <View style={{ height: 3, backgroundColor: C.border2, borderRadius: 2 }}>
              <View style={{ height: 3, width: `${(answeredQs / 20) * 100}%`, backgroundColor: qLeft <= 5 ? C.danger : C.gold, borderRadius: 2 }} />
            </View>
          </View>

          {/* Player strip */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
            contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}
          >
            {game.players.map((p) => {
              const a = av(p.avatarIdx);
              const isCur = currentQuestioner?.id === p.id && !p.isHost;
              return (
                <View key={p.id} style={[S.stripItem, isCur && S.stripItemCur, p.isEliminated && { opacity: 0.4 }]}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Text style={{ fontSize: 16 }}>{a.emoji}</Text>
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={{ fontSize: 11, color: C.muted, fontFamily: 'Outfit_500Medium', maxWidth: 60 }} numberOfLines={1}>
                      {p.isHost ? '👑 ' : p.isEliminated ? '❌ ' : ''}{p.name.split(' ')[0]}
                    </Text>
                    <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 12, color: C.gold }}>{p.score} pts</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Turn banner */}
          {pendingQ && viewerIsHost ? (
            <View style={[S.turnBanner, { borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.06)', marginBottom: 8 }]}>
              <View style={[S.turnDot, { backgroundColor: C.warn }]} />
              <Text style={[S.turnText, { color: C.warn }]}>A question awaits your answer!</Text>
            </View>
          ) : (
            <View style={[S.turnBanner, { marginBottom: 8 }]}>
              <View style={S.turnDot} />
              <Text style={S.turnText}>
                {currentQuestioner
                  ? `${currentQuestioner.name}'s turn${currentQuestioner.id === viewerId ? " — that's you!" : ''}`
                  : 'All guessers are out!'}
              </Text>
            </View>
          )}

          {/* Host secret reveal */}
          {viewerIsHost && (
            <View style={{ backgroundColor: 'rgba(109,40,217,0.08)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Outfit_400Regular' }}>Your Secret</Text>
              <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 20, color: C.violet2 }}>{game.secretAnswer}</Text>
            </View>
          )}

          {/* Q Feed */}
          <ScrollView ref={feedScrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {game.questions.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: C.dim, fontSize: 13, textAlign: 'center', lineHeight: 22, fontFamily: 'Outfit_400Regular' }}>
                  No questions yet.{'\n'}The first guesser will set the tone...
                </Text>
              </View>
            ) : (
              game.questions.map((q, i) => {
                const a = av(q.askerAvatarIdx);
                return (
                  <View key={q.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 14 }}>{a.emoji}</Text>
                      </View>
                      <Text style={{ fontSize: 15, fontFamily: 'Outfit_700Bold', color: C.text, flex: 1 }}>{q.askerName}</Text>
                      <Text style={{ fontSize: 14, color: C.gold, fontFamily: 'Outfit_700Bold' }}>Q{i + 1}</Text>
                    </View>
                    <Text style={{ fontSize: 16, color: C.text, lineHeight: 23, fontFamily: 'Outfit_400Regular' }}>{q.text}</Text>
                    {q.answer === null ? (
                      <View style={[S.qBadge, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }]}>
                        <Text style={{ color: C.warn, fontSize: 14, fontFamily: 'Outfit_700Bold' }}>⏳ Awaiting answer</Text>
                      </View>
                    ) : q.answer === 'SKIP' ? (
                      <View style={[S.qBadge, { backgroundColor: 'rgba(90,90,136,0.1)', borderColor: 'rgba(90,90,136,0.3)' }]}>
                        <Text style={{ color: C.dim, fontSize: 14, fontFamily: 'Outfit_700Bold' }}>⏭ Skipped — host timeout</Text>
                      </View>
                    ) : q.answer === 'PARTLY' ? (
                      <View style={[S.qBadge, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                        <Text style={{ color: C.warn, fontSize: 14, fontFamily: 'Outfit_700Bold' }}>
                          {'~ Partly'}{q.note ? `\n"${q.note}"` : ''}
                        </Text>
                      </View>
                    ) : (
                      <View style={[S.qBadge, {
                        backgroundColor: q.answer === 'YES' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        borderColor: q.answer === 'YES' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                      }]}>
                        <Text style={{ color: q.answer === 'YES' ? C.success : C.danger, fontSize: 14, fontFamily: 'Outfit_700Bold' }}>
                          {q.answer === 'YES' ? '✓ Yes' : '✗ No'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Action area */}
          <View style={{ paddingVertical: 10, paddingBottom: insets.bottom + 8 }}>
            {viewerIsHost && pendingQ ? (
              <View>
                <Text style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontFamily: 'Outfit_400Regular' }}>
                  {'Answering: '}<Text style={{ color: C.text, fontFamily: 'Outfit_600SemiBold' }}>"{pendingQ.text}"</Text>
                </Text>
                <View style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 11, color: hostSecsLeft <= 5 ? C.danger : C.warn, fontFamily: 'Outfit_400Regular' }}>⏱ Answer now</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: hostSecsLeft <= 5 ? C.danger : C.warn }}>{hostSecsLeft}s</Text>
                  </View>
                  <View style={{ height: 3, backgroundColor: C.border2, borderRadius: 2 }}>
                    <View style={{ height: 3, width: `${(hostSecsLeft / 15) * 100}%`, backgroundColor: hostSecsLeft <= 5 ? C.danger : C.warn, borderRadius: 2 }} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: partlyMode ? 8 : 0 }}>
                  <TouchableOpacity style={[S.btnYes, { flex: 1 }]} onPress={() => answerQ('YES')}>
                    <Text style={{ color: C.success, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>✓ YES</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[S.btnPartly, { flex: 1 }, partlyMode && S.btnPartlyActive]} onPress={() => { setPartlyMode((m) => !m); setPartlyNote(''); }}>
                    <Text style={{ color: C.warn, fontFamily: 'Outfit_700Bold', fontSize: 14 }}>~ PARTLY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[S.btnNo, { flex: 1 }]} onPress={() => answerQ('NO')}>
                    <Text style={{ color: C.danger, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>✗ NO</Text>
                  </TouchableOpacity>
                </View>
                {partlyMode && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[S.input, { flex: 1, paddingVertical: 10, fontSize: 13, marginBottom: 0 }]}
                      placeholder="Add a note (optional)..." placeholderTextColor={C.dim}
                      value={partlyNote} onChangeText={setPartlyNote}
                      onSubmitEditing={() => answerQ('PARTLY', partlyNote)}
                      autoFocus returnKeyType="done"
                    />
                    <TouchableOpacity style={[S.btnPartly, { paddingHorizontal: 16 }]} onPress={() => answerQ('PARTLY', partlyNote)}>
                      <Text style={{ color: C.warn, fontFamily: 'Outfit_700Bold', fontSize: 13 }}>Submit</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : viewerIsEliminated ? (
              <View style={{ padding: 14, backgroundColor: 'rgba(239,68,68,0.07)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: C.danger, fontFamily: 'Outfit_400Regular' }}>
                  ❌ You've been eliminated — watch the others play on...
                </Text>
              </View>
            ) : !viewerIsHost ? (
              canAsk ? (
                <View>
                  <View style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 11, color: guesserSecsLeft <= 10 ? C.danger : C.gold, fontFamily: 'Outfit_400Regular' }}>⏱ Your turn</Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: guesserSecsLeft <= 10 ? C.danger : C.gold }}>{guesserSecsLeft}s</Text>
                    </View>
                    <View style={{ height: 3, backgroundColor: C.border2, borderRadius: 2 }}>
                      <View style={{ height: 3, width: `${(guesserSecsLeft / 30) * 100}%`, backgroundColor: guesserSecsLeft <= 10 ? C.danger : C.gold, borderRadius: 2 }} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TextInput
                      style={[S.input, { flex: 1, paddingVertical: 12, fontSize: 14, marginBottom: 0 }]}
                      placeholder="Ask a yes/no question..." placeholderTextColor={C.dim}
                      value={questionInput} onChangeText={setQuestionInput}
                      onSubmitEditing={submitQuestion} returnKeyType="send"
                    />
                    <TouchableOpacity
                      style={[S.btnGold, { width: 'auto', paddingHorizontal: 18, borderRadius: 10 }, !questionInput.trim() && S.btnDisabled]}
                      onPress={submitQuestion} disabled={!questionInput.trim()}
                    >
                      <Text style={S.btnGoldText}>Ask</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={S.btnSolve} onPress={() => { setSolveInput(''); setSolveModalOpen(true); }}>
                    <Text style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 }}>💡 I Know It — Solve!</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, padding: 12, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, color: C.muted, fontFamily: 'Outfit_400Regular' }}>
                      {pendingQ ? 'Waiting for host to answer...' : `Waiting for ${currentQuestioner?.name || 'next player'}...`}
                    </Text>
                  </View>
                  <TouchableOpacity style={[S.btnSolve, { paddingHorizontal: 16 }]} onPress={() => { setSolveInput(''); setSolveModalOpen(true); }}>
                    <Text style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 13 }}>💡 Solve</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: C.dim, fontFamily: 'Outfit_400Regular' }}>
                  Host — watch and answer questions as they come in.
                </Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── RESULT ───────────────────────────────────────────────────────────────
  if (screen === 'result') {
    const winner = game.players.find((p) => p.id === game.roundWinnerId);
    const abandoned = !!game.hostAbandoned;
    const hostWon = !winner && !abandoned;
    const sorted = [...game.players].sort((a, b) => b.score - a.score);

    return (
      <View style={[S.flex, { backgroundColor: C.bg }]}>
        <SBar />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 24 }]}>
          {/* Winner block */}
          <View style={{ alignItems: 'center', padding: 28, backgroundColor: 'rgba(200,168,74,0.06)', borderWidth: 1, borderColor: C.goldDim, borderRadius: 20, marginVertical: 16 }}>
            <Text style={{ fontSize: 52, marginBottom: 8 }}>{abandoned ? '👻' : hostWon ? '🎩' : '🎉'}</Text>
            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 26, color: C.gold }}>
              {abandoned ? `${game.abandonedHostName || 'The host'} left` : hostWon ? host?.name : winner?.name}
            </Text>
            <Text style={{ fontSize: 10, color: C.goldDim, letterSpacing: 3, textTransform: 'uppercase', marginTop: 8, fontFamily: 'Outfit_400Regular', textAlign: 'center', lineHeight: 16 }}>
              {abandoned
                ? `Round ended — no points awarded.\n${host?.name || 'Next player'} is the new host.`
                : hostWon
                  ? 'defended the secret — nobody cracked it!'
                  : 'cracked the secret!'}
            </Text>
          </View>

          {/* Secret reveal */}
          <View style={{ backgroundColor: 'rgba(109,40,217,0.08)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Outfit_400Regular' }}>The Secret Was</Text>
            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 20, color: C.violet2 }}>{game.secretAnswer}</Text>
            <Text style={{ fontSize: 12, color: C.dim, marginTop: 4, fontFamily: 'Outfit_400Regular' }}>{game.theme?.icon} {game.theme?.label}</Text>
          </View>

          {/* Leaderboard */}
          <View style={S.card}>
            <Text style={S.cardTitle}>Leaderboard</Text>
            {sorted.map((p, i) => {
              const a = av(p.avatarIdx);
              return (
                <View key={p.id} style={[S.sbRow, i === 0 && S.sbRowFirst]}>
                  <Text style={[S.sbRank, i === 0 && { color: C.gold }]}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </Text>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{a.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: i === 0 ? 'Outfit_700Bold' : 'Outfit_500Medium', color: C.text }}>{p.name}</Text>
                    {p.id === game.roundWinnerId && <Text style={{ fontSize: 11, color: C.gold, fontFamily: 'Outfit_400Regular' }}>+10 pts this round</Text>}
                    {!game.roundWinnerId && !abandoned && p.isHost && <Text style={{ fontSize: 11, color: C.gold, fontFamily: 'Outfit_400Regular' }}>+5 pts (host win)</Text>}
                  </View>
                  <Text style={S.sbPts}>{p.score}</Text>
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <TouchableOpacity style={[S.btnOutline, { flex: 1 }]} onPress={() => setScreen('scoreboard')}>
              <Text style={S.btnOutlineText}>Final Scores</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.btnGold, { flex: 1 }]} onPress={nextRound}>
              <Text style={S.btnGoldText}>Next Round →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── FINAL SCOREBOARD ─────────────────────────────────────────────────────
  if (screen === 'scoreboard') {
    const sorted = [...game.players].sort((a, b) => b.score - a.score);
    return (
      <View style={[S.flex, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ fontSize: 60, marginBottom: 10 }}>🏆</Text>
            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 30, color: C.gold }}>Final Standings</Text>
          </View>
          <View style={S.card}>
            {sorted.map((p, i) => {
              const a = av(p.avatarIdx);
              return (
                <View key={p.id} style={[S.sbRow, i === 0 && S.sbRowFirst]}>
                  <Text style={[S.sbRank, { fontSize: i === 0 ? 22 : 18 }, i === 0 && { color: C.gold }]}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </Text>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontFamily: i === 0 ? 'Outfit_700Bold' : 'Outfit_500Medium', color: C.text }}>{p.name}</Text>
                  <Text style={[S.sbPts, { fontSize: i === 0 ? 24 : 20 }]}>{p.score}</Text>
                </View>
              );
            })}
          </View>
          <TouchableOpacity style={[S.btnGold, { marginTop: 16 }]} onPress={goHome}>
            <Text style={S.btnGoldText}>Play Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return null;
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingHorizontal: 16 },
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 16 },
  backBtn: { fontSize: 13, color: C.muted, fontFamily: 'Outfit_500Medium' },
  h2: { fontFamily: 'Cinzel_600SemiBold', fontSize: 20, color: C.text, marginBottom: 6 },
  muted: { fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular' },
  bodyText: { fontSize: 13, color: C.muted, lineHeight: 20, fontFamily: 'Outfit_400Regular' },
  sectionLabel: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: C.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  infoCard: { backgroundColor: C.card2, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },

  // Buttons
  btnGold: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  btnGoldText: { color: '#1a0f00', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border2, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  btnOutlineText: { color: C.text, fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  btnOutlineSm: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border2, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnOutlineSmText: { color: C.text, fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  btnDisabled: { opacity: 0.4 },
  btnYes: { backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnNo: { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPartly: { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPartlyActive: { backgroundColor: 'rgba(245,158,11,0.25)', borderColor: 'rgba(245,158,11,0.6)' },
  btnSolve: { backgroundColor: C.violet, borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },

  // Input
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 16, fontFamily: 'Outfit_400Regular', marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },

  // Card
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 18, marginBottom: 12 },
  cardTitle: { fontFamily: 'Cinzel_600SemiBold', fontSize: 12, color: C.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 },

  // Code box
  codeBox: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.goldDim, borderRadius: 16, padding: 22, alignItems: 'center', marginVertical: 14 },
  codeBoxLabel: { fontSize: 10, color: C.dim, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Outfit_400Regular' },
  codeBoxValue: { fontFamily: 'Cinzel_700Bold', fontSize: 38, color: C.gold, letterSpacing: 10 },
  codeBoxSub: { fontSize: 11, color: C.dim, marginTop: 8, fontFamily: 'Outfit_400Regular' },

  // Player item
  playerItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  playerName: { fontSize: 14, fontFamily: 'Outfit_500Medium', color: C.text },
  badgeHost: { backgroundColor: 'rgba(200,168,74,0.12)', borderWidth: 1, borderColor: C.goldDim, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  badgeHostText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: C.gold, letterSpacing: 1, textTransform: 'uppercase' },
  badgeGuesser: { backgroundColor: 'rgba(109,40,217,0.15)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.3)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  badgeGuesserText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: C.violet2, letterSpacing: 1, textTransform: 'uppercase' },

  // Theme tiles
  themeTile: { width: '48%', backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, borderRadius: 14, padding: 16, alignItems: 'center' },
  themeTileSel: { borderColor: C.gold, backgroundColor: 'rgba(200,168,74,0.08)' },

  // Visibility tiles (Public/Private)
  visTile: { flex: 1, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, borderRadius: 14, padding: 14, alignItems: 'center' },
  visTileSel: { borderColor: C.gold, backgroundColor: 'rgba(200,168,74,0.08)' },
  visTileTitle: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: C.text, marginBottom: 2 },
  visTileDesc: { fontSize: 11, color: C.muted, fontFamily: 'Outfit_400Regular', textAlign: 'center', lineHeight: 14, marginTop: 2 },

  // Public room row
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, borderRadius: 12, marginBottom: 8 },

  // Turn banner
  turnBanner: { backgroundColor: 'rgba(200,168,74,0.06)', borderWidth: 1, borderColor: C.goldDim, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  turnDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.gold },
  turnText: { fontSize: 13, color: C.gold, fontFamily: 'Outfit_500Medium', flex: 1 },

  // Player strip
  stripItem: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 6 },
  stripItemCur: { borderColor: C.goldDim, backgroundColor: 'rgba(200,168,74,0.08)' },

  // Q badge
  qBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 7 },

  // Scoreboard
  sbRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  sbRowFirst: { backgroundColor: 'rgba(200,168,74,0.08)', borderColor: C.goldDim },
  sbRank: { fontFamily: 'Cinzel_400Regular', fontSize: 18, color: C.dim, width: 28 },
  sbPts: { fontFamily: 'Cinzel_700Bold', fontSize: 22, color: C.gold },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end', alignItems: 'center' },
  modal: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32, width: '100%' },
  modalHandle: { width: 36, height: 4, backgroundColor: C.border2, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'Cinzel_700Bold', fontSize: 18, color: C.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 20, fontFamily: 'Outfit_400Regular' },
});
