// EnigmaGame.js — React Native version of the Enigma 20-Questions game
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Animated, Easing, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop, Circle, Ellipse, Rect, Path, G, Line } from 'react-native-svg';
import MaskedView from '@react-native-masked-view/masked-view';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as LinkingExpo from 'expo-linking';
import Constants from 'expo-constants';
import { supabase } from './config/supabase';
import { genCode, getInitials, fuzzyMatch } from './utils/helpers';
import { sounds } from './utils/sounds';


const getDailyDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

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

// ─── Typography system ──────────────────────────────────────────────────────────
// Two families, one editorial voice:
//   • Cinzel  — an inscriptional serif used only for display/headings; lends the
//     luxury, "engraved" character. Weights: 400/600/700/900.
//   • Outfit  — a clean geometric sans for everything readable: body, labels,
//     buttons, captions. Weights: 400/500/600/700.
// The scale below is the single source of truth for size / line-height / tracking.
// Headings tighten tracking as they grow; overlines & labels open it up wide;
// body copy runs at a generous ~1.5 line-height for editorial readability.
const F = {
  serif: 'Cinzel_400Regular',
  serifSemi: 'Cinzel_600SemiBold',
  serifBold: 'Cinzel_700Bold',
  serifBlack: 'Cinzel_900Black',
  sans: 'Outfit_400Regular',
  sansMed: 'Outfit_500Medium',
  sansSemi: 'Outfit_600SemiBold',
  sansBold: 'Outfit_700Bold',
};

const T = {
  // ── Display & headings (serif) ──
  display:  { fontFamily: F.serifBlack, fontSize: 32, lineHeight: 38, letterSpacing: 0.5, color: C.text },
  h1:       { fontFamily: F.serifBold,  fontSize: 24, lineHeight: 30, letterSpacing: 0.5, color: C.text },
  h2:       { fontFamily: F.serifSemi,  fontSize: 20, lineHeight: 26, letterSpacing: 0.3, color: C.text },
  h3:       { fontFamily: F.serifBold,  fontSize: 16, lineHeight: 22, letterSpacing: 1,   color: C.text },
  // ── Eyebrow / overline (sans, wide tracking, uppercase) ──
  overline: { fontFamily: F.sansBold,   fontSize: 11, lineHeight: 14, letterSpacing: 2.5, textTransform: 'uppercase', color: C.gold },
  // ── Body copy (sans) ──
  bodyLg:   { fontFamily: F.sans,       fontSize: 16, lineHeight: 24, color: C.text },
  body:     { fontFamily: F.sans,       fontSize: 14, lineHeight: 21, color: C.muted },
  bodySm:   { fontFamily: F.sans,       fontSize: 13, lineHeight: 20, color: C.muted },
  caption:  { fontFamily: F.sansMed,    fontSize: 12, lineHeight: 16, letterSpacing: 0.2, color: C.dim },
  // ── UI labels & actions (sans) ──
  label:    { fontFamily: F.sansBold,   fontSize: 11, lineHeight: 14, letterSpacing: 2, textTransform: 'uppercase', color: C.muted },
  button:   { fontFamily: F.sansSemi,   fontSize: 15, lineHeight: 20, letterSpacing: 0.4, color: C.text },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'personality', label: 'Famous Personality', icon: '👤', desc: 'A real person known worldwide' },
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
  { emoji: '🦄', bg: '#2a1a3a' },
  { emoji: '🐼', bg: '#1a1a1a' },
  { emoji: '🐸', bg: '#0a2a0a' },
  { emoji: '🚀', bg: '#0a0a3a' },
  { emoji: '🦖', bg: '#2a3a0a' },
  { emoji: '🌈', bg: '#1a2a3a' },
  { emoji: '🎮', bg: '#2a0a3a' },
  { emoji: '🍕', bg: '#3a1a0a' },
  { emoji: '🎨', bg: '#1a0a3a' },
  { emoji: '🏆', bg: '#3a2a0a' },
  { emoji: '🎪', bg: '#3a0a2a' },
  { emoji: '🐻', bg: '#2a1a0a' },
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
    { secret: 'Muhammad Ali Jinnah', hint: 'Founder of an Asian nation born from partition', facts: ['Founder and first Governor-General of Pakistan, born 25 December 1876 in Karachi', 'A brilliant lawyer trained at Lincoln\'s Inn, London; called to the bar at age 19', 'Initially championed Hindu-Muslim unity in the Indian National Congress', 'Led the All-India Muslim League and the Pakistan Movement demanding a separate Muslim homeland', 'Died just 13 months after Pakistan\'s independence on 11 September 1948; mourned as Quaid-e-Azam (Great Leader)'] },
    { secret: 'George Washington', hint: 'The first leader of a great republic', facts: ['First President of the United States (1789–1797), unanimously elected twice by the Electoral College', 'Commander-in-Chief of the Continental Army during the American Revolutionary War (1775–1783)', 'Presided over the Constitutional Convention of 1787 that drafted the US Constitution', 'Set key precedents including voluntarily stepping down after two terms', 'His face appears on the US dollar bill and quarter; the capital city is named after him'] },
    { secret: 'Abraham Lincoln', hint: 'An American president who ended slavery', facts: ['16th President of the United States (1861–1865); born in a log cabin in Kentucky in 1809', 'Led the United States through the Civil War (1861–1865), preserving the Union', 'Issued the Emancipation Proclamation in 1863, declaring enslaved people in rebel states free', 'Delivered the Gettysburg Address in 1863 — one of history\'s most famous speeches', 'Assassinated by John Wilkes Booth at Ford\'s Theatre, Washington DC, on 14 April 1865'] },
    { secret: 'John F. Kennedy', hint: 'A charismatic US president assassinated in Dallas', facts: ['35th President of the United States (1961–1963); the youngest elected president at age 43', 'The first Roman Catholic to be elected US President', 'Navigated the Cuban Missile Crisis in 1962, pulling the world back from nuclear war', 'Pledged to land a man on the Moon before 1970, launching the Apollo programme', 'Assassinated in Dallas, Texas on 22 November 1963; Lee Harvey Oswald was charged with the killing'] },
    { secret: 'Franklin D. Roosevelt', hint: 'The only US president elected four times', facts: ['32nd President of the USA (1933–1945); the only president to serve four terms', 'Led the United States through the Great Depression with his "New Deal" economic programmes', 'Guided the USA through World War II; his leadership was vital to Allied victory', 'Established Social Security, transforming the US welfare state', 'Contracted polio at age 39 and was largely paralysed from the waist down, largely concealed from the public'] },
    { secret: 'Theodore Roosevelt', hint: 'A US president famous for conservation and courage', facts: ['26th President of the United States (1901–1909); youngest ever to hold the office at 42', 'Known as a conservationist who established 150 national forests and 5 national parks', 'Awarded the Nobel Peace Prize in 1906 for mediating the Russo-Japanese War', 'The "teddy bear" toy is named after him following a famous hunting incident', 'A war hero who led the Rough Riders cavalry charge at the Battle of San Juan Hill in 1898'] },
    { secret: 'Richard Nixon', hint: 'The only US president to resign from office', facts: ['37th President of the United States (1969–1974); the only US president ever to resign', 'Opened diplomatic relations with China in 1972 after decades of US-China estrangement', 'Ended US involvement in the Vietnam War and normalised relations with the Soviet Union (détente)', 'Won re-election in 1972 by a landslide but was brought down by the Watergate scandal', 'Resigned on 9 August 1974 amid imminent impeachment over the Watergate cover-up'] },
    { secret: 'Ronald Reagan', hint: 'A Hollywood actor who became US President', facts: ['40th President of the United States (1981–1989); former Hollywood actor and California Governor', 'Launched "Reaganomics" — supply-side economics with tax cuts and deregulation', 'Confronted the Soviet Union with a massive military build-up, accelerating the Cold War\'s end', 'Survived an assassination attempt on 30 March 1981, just 69 days into his presidency', 'His 1987 Berlin speech: "Mr. Gorbachev, tear down this wall!"'] },
    { secret: 'Barack Obama', hint: 'The first African-American US President', facts: ['44th President of the United States (2009–2017); the first African-American president', 'Won the Nobel Peace Prize in 2009, in the first year of his presidency', 'Signed the Affordable Care Act (2010) — the most significant US health reform in decades', 'Ordered the raid that killed Osama bin Laden in Abbottabad, Pakistan, in May 2011', 'A Harvard Law graduate and editor of the Harvard Law Review before entering politics'] },
    { secret: 'Bill Clinton', hint: 'A US president known for prosperity and scandal', facts: ['42nd President of the United States (1993–2001); born William Jefferson Blythe III in Arkansas', 'Presided over the longest peacetime economic expansion in US history', 'His presidency saw the signing of NAFTA and the North American free trade era', 'Only the second US president to be impeached (1998) — acquitted by the Senate', 'Famous for his saxophone playing; appeared on the Arsenio Hall Show during his 1992 campaign'] },
    { secret: 'Donald Trump', hint: 'A US president who was impeached twice', facts: ['45th and 47th President of the United States; first elected in 2016, re-elected in 2024', 'The only US president to be impeached twice — in 2019 and 2021 — acquitted both times', 'A real estate mogul and reality TV host before politics; known for The Apprentice', 'His presidency was defined by "America First" policies, trade wars with China and a border wall push', 'First former US president to face criminal conviction, found guilty in New York in May 2024'] },
    { secret: 'Winston Churchill', hint: 'Britain\'s wartime leader who refused to surrender', facts: ['British Prime Minister (1940–45 and 1951–55); a defining figure of 20th-century history', 'Rallied Britain during WWII\'s darkest hours with legendary speeches: "We shall fight on the beaches"', 'Won the Nobel Prize in Literature in 1953 for his six-volume history of World War II', 'Half-American: his mother Jennie Jerome was from New York City', 'A prolific writer, painter and cigar smoker; reportedly drank champagne every day'] },
    { secret: 'Princess Diana', hint: 'Britain\'s beloved "People\'s Princess"', facts: ['Born Lady Diana Spencer on 1 July 1961; married Prince Charles at St Paul\'s Cathedral in 1981', 'Became the "People\'s Princess" for her warmth, charity work and ability to connect with ordinary people', 'Worked tirelessly for HIV/AIDS patients and was a prominent campaigner against landmines', 'Divorced Prince Charles in 1996; famously said in an interview: "There were three of us in this marriage"', 'Killed in a car crash in Paris on 31 August 1997, aged 36, sparking extraordinary global grief'] },
    { secret: 'Vladimir Lenin', hint: 'Leader of the Russian communist revolution', facts: ['Born Vladimir Ilyich Ulyanov in 1870; adopted "Lenin" as a revolutionary name', 'Led the Bolshevik Revolution in October 1917 that overthrew Russia\'s Provisional Government', 'Founded the Soviet Union (USSR) in 1922 as the world\'s first communist state', 'Developed "Leninism" — the theory of a revolutionary vanguard party guiding the communist movement', 'Died in 1924; his embalmed body is still on public display in the Lenin Mausoleum in Moscow\'s Red Square'] },
    { secret: 'Chairman Mao (Mao Zedong)', hint: 'Founder of communist China', facts: ['Founded the People\'s Republic of China on 1 October 1949 and ruled until his death in 1976', 'Led the Communist Party through the Chinese Civil War, defeating the Nationalist forces', 'Launched the Great Leap Forward (1958–62) — a disastrous campaign that caused a famine killing tens of millions', 'Initiated the Cultural Revolution (1966–76) to purge rivals and reassert communist ideology', 'His portrait still hangs on Tiananmen Gate; his preserved body lies in a mausoleum in Tiananmen Square'] },
    { secret: 'Deng Xiaoping', hint: 'The leader who modernised China\'s economy', facts: ['Paramount leader of China from 1978 to 1992; transformed China from a communist economy to a market one', 'Survived political purges twice under Mao before emerging as China\'s most powerful figure', 'Launched "Reform and Opening Up" — welcoming foreign investment and creating Special Economic Zones', 'Under his leadership China\'s GDP grew at nearly 10% annually, lifting hundreds of millions from poverty', 'Ordered the military crackdown on Tiananmen Square protesters on 4 June 1989'] },
    { secret: 'President Xi Jinping', hint: 'China\'s most powerful leader since Mao', facts: ['General Secretary of the Chinese Communist Party since 2012; China\'s most powerful leader since Mao', 'Consolidated power by removing presidential term limits in 2018, enabling him to rule indefinitely', 'Launched the Belt and Road Initiative — a global infrastructure investment strategy worth trillions', 'Oversaw strict crackdowns on dissent, press freedom, and Hong Kong\'s autonomy', 'Born in 1953; his father Xi Zhongxun was a revolutionary leader later purged by Mao'] },
    { secret: 'Albert Einstein', hint: 'The physicist who gave us E=mc²', facts: ['German-born theoretical physicist born in Ulm in 1879; developed the theory of relativity', 'His mass-energy formula E=mc² is the world\'s most famous equation', 'Won the Nobel Prize in Physics in 1921 for discovering the photoelectric effect', 'Fled Nazi Germany in 1933 and settled in Princeton, New Jersey, becoming a US citizen', 'Wrote a 1939 letter to President Roosevelt warning that Germany might develop an atomic bomb'] },
    { secret: 'J. Robert Oppenheimer', hint: 'The physicist who led the Manhattan Project', facts: ['American physicist (1904–1967) who led the Manhattan Project to build the first atomic bomb', 'Scientific director of Los Alamos Laboratory where the bomb was designed and built', 'Watched the first nuclear test on 16 July 1945 and quoted Hindu scripture: "Now I am become Death, the destroyer of worlds"', 'Opposed developing the hydrogen bomb and had his security clearance stripped in 1954', 'Posthumously received a Presidential Medal of Freedom in 2022; his clearance was formally restored'] },
    { secret: 'Allama Iqbal', hint: 'Poet-philosopher and spiritual father of Pakistan', facts: ['Muhammad Iqbal (1877–1938) — poet, philosopher and spiritual father of Pakistan', 'Wrote in both Urdu and Persian; his poetry inspired South Asian Muslim identity and pride', 'Delivered the Allahabad Address (1930) — the first major political proposal for a separate Muslim state in India', 'Studied at Cambridge and Munich, earning a PhD in philosophy', 'His poem "Saare Jahan Se Achha" (1904) became one of the most beloved patriotic songs of South Asia'] },
    { secret: 'Leo Tolstoy', hint: 'Russian author of War and Peace', facts: ['Russian novelist (1828–1910); author of War and Peace and Anna Karenina', 'War and Peace (1869) is a sweeping epic of Russian society during the Napoleonic Wars', 'Underwent a profound spiritual crisis in his 50s and became a Christian anarchist and pacifist', 'His ideas on non-violent resistance directly influenced Mahatma Gandhi', 'Excommunicated by the Russian Orthodox Church in 1901 for his criticism of the institution'] },
    { secret: 'George Bernard Shaw', hint: 'Irish playwright who wrote Pygmalion', facts: ['Irish playwright (1856–1950); the only person to win both a Nobel Prize (Literature, 1925) and an Oscar (Pygmalion, 1938)', 'Author of more than 60 plays including Pygmalion, Major Barbara, and Saint Joan', 'A committed socialist and founding member of the Fabian Society', 'Known for aphorisms like "England and America are two countries divided by a common language"', 'Died aged 94 after falling from an apple tree he was pruning in his garden'] },
    { secret: 'Karl Marx', hint: 'Philosopher whose ideas shaped communist revolutions', facts: ['German philosopher and economist (1818–1883); co-author of The Communist Manifesto (1848)', 'His major work Das Kapital (1867) analysed capitalism and predicted its eventual collapse', 'Argued history is shaped by class struggle between owners (bourgeoisie) and workers (proletariat)', 'Lived most of his adult life in poverty in London, supported financially by his friend Friedrich Engels', 'His ideas inspired communist revolutions in Russia, China, Cuba and beyond'] },
    { secret: 'William Shakespeare', hint: 'The greatest playwright in the English language', facts: ['English playwright and poet (1564–1616); widely regarded as the greatest writer in the English language', 'Born in Stratford-upon-Avon; wrote approximately 37 plays, 154 sonnets and several poems', 'His plays include Hamlet, Othello, Macbeth, Romeo and Juliet, and A Midsummer Night\'s Dream', 'Part-owner of the Globe Theatre in London where many of his plays were performed', 'Many details of his life remain uncertain; some scholars have debated whether he wrote his own works'] },
    { secret: 'Victor Hugo', hint: 'French author of Les Misérables', facts: ['French novelist and poet (1802–1885); author of Les Misérables and The Hunchback of Notre-Dame', 'Les Misérables (1862) follows ex-convict Jean Valjean across decades of 19th-century France', 'A passionate advocate for the poor, political freedom, and the abolition of the death penalty', 'Exiled for 19 years by Napoleon III after refusing to accept the coup of 1851', 'His funeral in 1885 drew an estimated 2 million mourners to Paris — one of history\'s largest'] },
    { secret: 'Wolfgang Amadeus Mozart', hint: 'An Austrian child prodigy composer', facts: ['Austrian composer (1756–1791); a child prodigy who began composing at age 5', 'Composed over 800 works including 41 symphonies, 27 piano concertos and 22 operas', 'His operas The Magic Flute, Don Giovanni and The Marriage of Figaro are masterpieces', 'Despite his fame, he died in poverty aged 35 and was buried in an unmarked communal grave', 'His unfinished Requiem, written on his deathbed, remains one of classical music\'s most haunting works'] },
    { secret: 'Vincent van Gogh', hint: 'A Dutch painter famous for The Starry Night', facts: ['Dutch Post-Impressionist painter (1853–1890); created over 2,100 artworks in just 10 years', 'Famous works include The Starry Night, Sunflowers and his series of self-portraits', 'Suffered severe mental illness; famously cut off part of his own ear after an argument with Paul Gauguin', 'Sold only one painting during his lifetime; his work was not widely appreciated until after his death', 'Died aged 37 from a gunshot wound; whether suicide or accident remains debated'] },
    { secret: 'Prophet Adam', hint: 'The first man and first prophet in Abrahamic tradition', facts: ['Considered the first man and first prophet in Islam, Judaism and Christianity', 'In the Abrahamic tradition, created by God from clay and breathed into life', 'Placed in Paradise with his wife Hawwa (Eve)', 'Descended to Earth after eating the forbidden fruit — the first act of human disobedience', 'In Islamic tradition, taught by Allah the names of all things; the first prophet to whom God spoke directly'] },
    { secret: 'Prophet Noah', hint: 'The prophet who built an ark to survive a great flood', facts: ['Revered in Islam, Judaism and Christianity as the prophet sent by God to warn a corrupt humanity', 'Commanded by God to build a great Ark and save pairs of every living creature from a great flood', 'The flood lasted 40 days according to Biblical tradition; the Quran describes the entire Earth submerged', 'His Ark is said to have come to rest on Mount Ararat in modern Turkey', 'In Islam, one of the five greatest prophets (Ulul Azm); his story appears extensively in the Quran'] },
    { secret: 'Prophet Abraham', hint: 'The patriarch of all three Abrahamic faiths', facts: ['Father figure of all three Abrahamic faiths — Islam, Judaism and Christianity', 'In Islamic tradition, built the Kaaba in Mecca with his son Ismail as the first house of monotheistic worship', 'Tested by God with the command to sacrifice his son; God provided a ram in his place at the last moment', 'Left his wife Hajar and infant son Ismail in the desert valley of Mecca, trusting in God', 'Declared Khalilullah (Friend of God) in Islamic tradition; called a Muslim (one who submits to God) in the Quran'] },
    { secret: 'Prophet David', hint: 'A young shepherd who became a great king', facts: ['Revered prophet and king in Islam, Judaism and Christianity', 'As a young man, famously defeated the giant warrior Goliath (Jalut) with a sling and stone', 'Became King of Israel and Jerusalem; a gifted musician and poet', 'Given the Psalms (Zabur) by God — his sacred scripture in Islamic tradition', 'Renowned in Islam for his beautiful voice; it is said birds and mountains echoed when he recited God\'s praises'] },
    { secret: 'Prophet Solomon', hint: 'A king renowned for his unparalleled wisdom', facts: ['King of Israel and revered prophet in Islam, Judaism and Christianity; son of Prophet David', 'Famous for his unparalleled wisdom — the Judgment of Solomon is one of history\'s most famous stories', 'Built the magnificent First Temple in Jerusalem, one of history\'s great religious structures', 'In Islamic tradition, could speak to animals and birds and commanded an army of djinn', 'The Queen of Sheba (Bilqis in Islam) travelled to visit him, drawn by his legendary wisdom'] },
    { secret: 'Prophet Moses', hint: 'The prophet who led the Israelites out of slavery', facts: ['The most frequently mentioned prophet in the Quran; also central to Judaism and Christianity', 'Born in Egypt to an Israelite family; raised in Pharaoh\'s palace after being found in a basket on the Nile', 'Received the Torah and the Ten Commandments from God on Mount Sinai', 'Led the Israelites out of slavery in Egypt — the Exodus — parting the Red Sea by God\'s command', 'In Islamic tradition, called Kalimullah (one who spoke directly to God); one of the five greatest prophets'] },
    { secret: 'Prophet Jesus', hint: 'A prophet revered in both Islam and Christianity', facts: ['Revered as a mighty prophet in Islam; considered the Son of God and saviour in Christianity', 'Born miraculously to the Virgin Mary (Maryam) — honoured in both the Bible and the Quran', 'Performed miracles: healing the blind and lepers, and in the Quran, speaking as a newborn', 'In Christianity, crucified and resurrected; in Islam, raised alive to heaven by God and will return before the Day of Judgement', 'Mary (Maryam) is the only woman mentioned by name in the Quran; an entire chapter (Surah Maryam) is named after her'] },
    { secret: 'Prophet Muhammad', hint: 'The final prophet of Islam', facts: ['The final prophet of Islam, born in Mecca around 570 CE into the respected Quraish tribe', 'Received the first Quranic revelation at age 40, in the Cave of Hira, through the Angel Jibreel (Gabriel)', 'Migrated from Mecca to Medina in 622 CE — the Hijra — which marks Year One of the Islamic calendar', 'United the Arabian tribes under Islam; by his death in 632 CE most of Arabia had accepted the faith', 'The Quran, revealed over 23 years, and his Sunnah form the foundation of Islamic life for over 1.8 billion Muslims'] },
    { secret: 'Michael Jackson', hint: 'The King of Pop', facts: ['American singer, songwriter and dancer (1958–2009); known as the "King of Pop"', 'His 1982 album Thriller is the best-selling album in history, with over 66 million copies sold', 'Pioneered the music video as an art form; Thriller, Billie Jean and Beat It changed the medium forever', 'Known for distinctive dance moves including the moonwalk, which he debuted on television in 1983', 'Died on 25 June 2009 from acute propofol intoxication administered by his personal physician'] },
    { secret: 'Madonna', hint: 'The Queen of Pop', facts: ['American singer and actress (born 1958); known as the "Queen of Pop"', 'Has sold over 300 million records worldwide — one of the best-selling music artists of all time', 'Pushed boundaries of sexuality, religion and celebrity with provocative music videos and performances', 'Known for constantly reinventing her image across four decades in the spotlight', 'Like a Virgin (1984), Material Girl (1984) and Vogue (1990) are among her iconic hits'] },
    { secret: 'Taylor Swift', hint: 'A singer-songwriter whose Eras Tour broke all records', facts: ['American singer-songwriter (born 1989); one of the best-selling music artists in history', 'Began as a country artist before crossing over to global pop with albums like 1989 and Folklore', 'Known for writing all her own songs — largely autobiographical lyrics about relationships and personal experiences', 'First artist to simultaneously occupy the entire top 10 of the Billboard Hot 100 in 2022', 'Her Eras Tour (2023–24) became the highest-grossing concert tour in history, surpassing $2 billion'] },
    { secret: 'Frank Sinatra', hint: 'The Chairman of the Board; Ol\' Blue Eyes', facts: ['American singer and actor (1915–1998); known as "Ol\' Blue Eyes" and "The Chairman of the Board"', 'Recorded classics like My Way, New York New York, and Fly Me to the Moon', 'Won an Academy Award for Best Supporting Actor for From Here to Eternity (1953)', 'A central figure of the Rat Pack alongside Dean Martin and Sammy Davis Jr.', 'My Way (1969) became his signature song and one of the most covered songs in history'] },
    { secret: 'Neil Diamond', hint: 'Singer known for Sweet Caroline', facts: ['American singer-songwriter (born 1941); sold over 100 million records worldwide', 'Known for Sweet Caroline, Cracklin\' Rosie, Cherry Cherry and I Am... I Said', 'Sweet Caroline (1969) has become a beloved anthem at sporting events worldwide, especially at Fenway Park', 'Inducted into the Rock and Roll Hall of Fame in 2011', 'Diagnosed with Parkinson\'s disease in 2018 and retired from touring shortly after'] },
    { secret: 'Zulfiqar Ali Bhutto', hint: 'Pakistan\'s charismatic prime minister who was hanged', facts: ['Founder of the Pakistan People\'s Party (PPP) and Prime Minister of Pakistan (1973–1977)', 'Served as Pakistan\'s President (1971–73) following the 1971 war and separation of East Pakistan', 'Oversaw the 1973 Constitution of Pakistan, which remains in force today', 'Launched Pakistan\'s nuclear weapons programme after the 1971 defeat', 'Overthrown in a military coup by General Zia ul-Haq in 1977 and executed by hanging on 4 April 1979'] },
    { secret: 'Benazir Bhutto', hint: 'First female Prime Minister of a Muslim nation', facts: ['First female Prime Minister of Pakistan (served 1988–90 and 1993–96); daughter of Zulfiqar Ali Bhutto', 'First woman ever elected to lead a Muslim-majority nation', 'Returned from exile to Pakistan in October 2007 to contest elections; survived one bomb attack on her return', 'Assassinated on 27 December 2007 in Rawalpindi at a political rally; she was 54 years old', 'Symbol of democracy, women\'s empowerment and the PPP\'s enduring legacy in Pakistan'] },
    { secret: 'Muhammad Ali', hint: 'The greatest boxer of all time', facts: ['Born Cassius Clay in Louisville, Kentucky in 1942; changed his name after joining the Nation of Islam in 1964', 'Three-time heavyweight boxing world champion; considered the greatest boxer of all time', 'Won an Olympic gold medal at the 1960 Rome Games at age 18', 'Refused induction into the US military during the Vietnam War; stripped of his title in 1967', 'Famous for "Float like a butterfly, sting like a bee" — and for backing it up in the ring'] },
    { secret: 'Michael Jordan', hint: 'Six-time NBA champion with the Chicago Bulls', facts: ['American basketball player (born 1963); widely regarded as the greatest basketball player of all time', 'Won six NBA Championships with the Chicago Bulls (1991–93, 1996–98), earning Finals MVP each time', 'Won two Olympic gold medals for Team USA (1984 and 1992 Dream Team)', 'His Air Jordan shoe line, launched with Nike in 1984, became a billion-dollar brand', 'Averaged 30.1 points per game in his NBA career — the highest scoring average in NBA history'] },
    { secret: 'Pelé', hint: 'Brazilian footballer who won three World Cups', facts: ['Brazilian footballer (1940–2022); widely regarded as one of the greatest footballers of all time', 'The only player to win three FIFA World Cups (1958, 1962, 1970)', 'Scored an extraordinary 1,279 goals in 1,363 career games by his own count', 'Made his World Cup debut at age 17 in 1958, scoring 6 goals including a semi-final hat-trick', 'His real name was Edson Arantes do Nascimento; "Pelé" is a childhood nickname of unknown origin'] },
    { secret: 'Cristiano Ronaldo', hint: 'Portuguese footballer known for his "Siu!" celebration', facts: ['Portuguese footballer (born 1985); one of the greatest footballers of all time', 'Has won the Ballon d\'Or five times and is the all-time top scorer in UEFA Champions League history', 'Won trophies at Manchester United, Real Madrid and Juventus, plus UEFA Euro 2016 with Portugal', 'The first player to score at five different FIFA World Cups', 'Known for his extraordinary athleticism, free kicks, and his iconic "Siu!" arms-out celebration'] },
    { secret: 'Lionel Messi', hint: 'Argentine footballer and eight-time Ballon d\'Or winner', facts: ['Argentine footballer (born 1987); widely regarded as the greatest footballer of all time', 'Has won the Ballon d\'Or a record eight times', 'Led Argentina to FIFA World Cup glory in 2022 — the crowning achievement of his career', 'Scored over 800 career goals, with 672 for FC Barcelona alone over 17 seasons', 'Born with a growth hormone deficiency; FC Barcelona paid for his treatment and signed him at age 13'] },
    { secret: 'Sachin Tendulkar', hint: 'Cricket\'s "God" and scorer of 100 international centuries', facts: ['Indian cricketer (born 1973); widely regarded as the greatest batsman in cricket history', 'Scored 100 international centuries — the first and only player ever to achieve this milestone', 'Amassed 34,357 international runs — the world record in both Tests and ODIs', 'Played international cricket for 24 years (1989–2013), earning the nickname "The Little Master"', 'Received the Bharat Ratna (India\'s highest civilian honour) in 2014 — the first sportsperson to do so'] },
    { secret: 'Usain Bolt', hint: 'The fastest human ever recorded', facts: ['Jamaican sprinter (born 1986); the fastest human being ever officially recorded', 'Set world records in the 100m (9.58s) and 200m (19.19s) at the 2009 Berlin World Championships — both still stand', 'Won three consecutive Olympic sprint doubles (100m + 200m gold) in 2008, 2012 and 2016', 'Also won the 4×100m relay three times at the Olympics; holds eight Olympic gold medals in total', 'Known for his lightning bolt victory pose and dancing celebrations even before crossing the finish line'] },
    { secret: 'Imran Khan', hint: 'Pakistan\'s World Cup-winning cricket captain turned Prime Minister', facts: ['Pakistan\'s greatest cricket all-rounder: 3,807 Test runs and 362 Test wickets across an 18-year international career', 'Captained Pakistan to their only Cricket World Cup victory in 1992 in Melbourne, famously rallying his "cornered tigers"', 'Founded Pakistan Tehreek-e-Insaf (PTI) in 1996; served as Prime Minister from August 2018 to April 2022', 'Founded the Shaukat Khanum Memorial Cancer Hospital in 1994 in memory of his mother — a landmark cancer centre in South Asia', 'Became the first Pakistani PM removed by a no-confidence vote in April 2022; arrested multiple times from 2023 in a dramatic political crisis'] },
    { secret: 'Mikhail Gorbachev', hint: 'The Soviet leader whose reforms ended the Cold War', facts: ['Last leader of the Soviet Union — General Secretary from 1985 and President from 1990 until his resignation on 25 December 1991', 'Introduced glasnost (openness) and perestroika (restructuring) — reforms that unintentionally accelerated the Soviet collapse', 'Won the Nobel Peace Prize in 1990 for his pivotal role in ending the Cold War', 'Agreed to German reunification and the withdrawal of Soviet troops from Eastern Europe without a military response', 'Died in August 2022 aged 91; mourned in the West but viewed with mixed feelings in Russia for the loss of superpower status'] },
    { secret: 'Isaac Newton', hint: 'The physicist who explained gravity and invented calculus', facts: ['English mathematician and physicist (1643–1727); widely regarded as one of history\'s greatest scientists', 'Formulated the three laws of motion and the law of universal gravitation — the foundations of classical mechanics', 'The apple story is largely authentic: a falling apple in 1666 prompted his thinking on gravity, confirmed by contemporaries', 'Invented calculus independently and simultaneously with Leibniz; a bitter priority dispute followed', 'Also served as Master of the Royal Mint, pursuing counterfeiters with the same rigour he applied to science; knighted in 1705'] },
    { secret: 'Nelson Mandela', hint: 'The anti-apartheid leader who became South Africa\'s first Black president', facts: ['South African anti-apartheid activist, lawyer and statesman (1918–2013)', 'Sentenced to life imprisonment in 1964 for sabotage; served 27 years on Robben Island, becoming the world\'s most famous political prisoner', 'Became South Africa\'s first democratically elected President (1994–1999) after apartheid ended', 'Won the Nobel Peace Prize in 1993 jointly with F.W. de Klerk for negotiating a peaceful end to apartheid', 'Chose reconciliation over retribution; his Truth and Reconciliation Commission became a global model for post-conflict societies'] },
    { secret: 'Margaret Thatcher', hint: 'Britain\'s "Iron Lady" and first female Prime Minister', facts: ['British Prime Minister 1979–1990; the first and only female Prime Minister of the United Kingdom', 'Known as the "Iron Lady" — a nickname coined by a Soviet military newspaper in 1976, which she embraced', 'Pursued radical free-market "Thatcherism": privatisation of state industries, trade union reform, and deregulation', 'Led Britain to victory in the 1982 Falklands War against Argentina, which dramatically rescued her declining poll ratings', 'Resigned in November 1990 after losing support within her own party over the deeply unpopular Community Charge (poll tax)'] },
    { secret: 'Charles De Gaulle', hint: 'The French general who rallied France from exile and shaped the Fifth Republic', facts: ['French general and statesman (1890–1970); leader of the Free French forces during WWII', 'On 18 June 1940, broadcast from London urging France to resist Nazi occupation — his Appeal of 18 June became one of history\'s great calls to arms', 'Founded and led the Fifth Republic of France as its first President (1959–1969), giving France a strong executive presidency', 'Withdrew France from NATO\'s integrated military command in 1966, demanding French strategic independence', 'Survived over 30 assassination attempts and resigned after losing a 1969 constitutional referendum; died the following year aged 79'] },
    { secret: 'Lee Kuan Yew', hint: 'The founding father who transformed Singapore into a global powerhouse', facts: ['First Prime Minister of Singapore (1959–1990); transformed a poor city-state with no natural resources into one of Asia\'s wealthiest economies', 'Led Singapore after its sudden separation from Malaysia in 1965, building stability and prosperity almost from scratch', 'Oversaw per capita income growth from under $500 in 1965 to over $30,000 by 1990 — one of history\'s greatest economic transformations', 'Enforced meritocracy, zero tolerance for corruption and strict rule of law as foundations of Singapore\'s success', 'Regarded by many Asian leaders as a mentor; his model of development influenced nations across the region'] },
    { secret: 'Mahathir Mohamad', hint: 'Malaysia\'s transformational leader and the world\'s oldest elected head of government', facts: ['Malaysian statesman (born 1925); Prime Minister twice — 1981 to 2003 and again 2018 to 2020', 'The longest-serving elected leader in Malaysian history; oversaw rapid industrialisation and the "Malaysia Boleh" national confidence movement', 'Launched the Multimedia Super Corridor and Petronas Twin Towers — symbols of Malaysia\'s modernisation ambitions', 'Defiantly rejected IMF prescriptions during the 1997 Asian financial crisis, pegging the ringgit and imposing capital controls', 'Returned to power in 2018 aged 92 — defeating his own protégé Najib Razak — becoming the world\'s oldest elected head of government'] },
    { secret: 'Stephen Hawking', hint: 'The physicist who explained black holes from a wheelchair', facts: ['British theoretical physicist (1942–2018); made revolutionary contributions to cosmology and the understanding of black holes', 'Proved (with Roger Penrose) that the universe began from a singularity — providing mathematical underpinning for the Big Bang theory', 'Discovered "Hawking radiation": the theoretical prediction that black holes slowly emit radiation and eventually evaporate', 'Diagnosed with motor neurone disease (ALS) at 21 and given 2 years to live; defied his prognosis for over 50 years', 'His book A Brief History of Time (1988) sold over 25 million copies; he communicated through a speech device, using a single cheek muscle'] },
    { secret: 'Thomas Edison', hint: 'The inventor who electrified the world', facts: ['American inventor (1847–1931); held 1,093 US patents — more than any individual in American history', 'Invented the phonograph (1877), the practical incandescent light bulb (1879) and the first motion picture camera', 'Established the world\'s first industrial research laboratory at Menlo Park, New Jersey in 1876 — the model for modern R&D', 'Built the first commercial electrical power network in New York City in 1882, launching the electric age', 'Had a famous "War of Currents" rivalry with Nikola Tesla over AC vs DC electricity; history ultimately sided with Tesla\'s AC system'] },
    { secret: 'Alan Turing', hint: 'The mathematician who cracked Enigma and fathered computer science', facts: ['British mathematician and computer scientist (1912–1954); widely regarded as the father of theoretical computer science and artificial intelligence', 'Broke the Nazi Enigma code at Bletchley Park during WWII — a contribution credited with shortening the war by an estimated two years', 'Proposed the Turing Test (1950) as a measure of machine intelligence — a concept that remains central to AI debates today', 'Prosecuted in 1952 for homosexuality (then illegal in Britain) and subjected to chemical castration by the state', 'Received a royal pardon posthumously in 2013; his face now appears on the British £50 note'] },
    { secret: 'Charlie Chaplin', hint: 'The silent film comedian who created the iconic "Little Tramp"', facts: ['British actor and filmmaker (1889–1977); one of the most influential comic performers in cinema history', 'Created his iconic "Tramp" character — bowler hat, cane, toothbrush moustache, baggy trousers — in 1914; the character became one of cinema\'s most recognised images', 'Wrote, directed, starred in and composed music for his own films, including The Kid (1921), The Gold Rush (1925) and Modern Times (1936)', 'His 1940 film The Great Dictator was a direct and courageous satirical attack on Adolf Hitler, made while the USA was still neutral', 'Exiled from the USA during McCarthyism in 1952; received an honorary Academy Award in 1972 when he was finally allowed to return'] },
    { secret: 'Elvis Presley', hint: 'The King of Rock and Roll', facts: ['American singer (1935–1977); the "King of Rock and Roll" and one of the most influential musicians of the 20th century', 'His fusion of gospel, blues, country and R&B created a new sound that transformed popular music and defined a generation', '"Heartbreak Hotel" (1956) went to No. 1 and launched a cultural phenomenon; he sold over 500 million records in his career', 'Served in the US Army (1958–60); his induction was front-page news worldwide and he refused special treatment', 'Died at Graceland, Memphis on 16 August 1977 aged 42; over 75,000 fans lined the streets for his funeral procession'] },
    { secret: 'Audrey Hepburn', hint: 'The Hollywood icon and UNICEF ambassador who survived wartime famine as a child', facts: ['Belgian-born British actress and humanitarian (1929–1993); one of cinema\'s greatest style icons', 'One of very few entertainers to achieve EGOT status: Emmy, Grammy, Oscar and Tony awards across her career', 'Most famous roles include Holly Golightly in Breakfast at Tiffany\'s (1961) and Princess Ann in Roman Holiday (1953), for which she won the Oscar', 'Survived the Nazi occupation of the Netherlands as a child, suffering severe malnutrition during the 1944 Hunger Winter — an experience that shaped her humanitarian work', 'Spent her final years as a UNICEF Goodwill Ambassador, travelling to Africa, South America and Asia to advocate for impoverished children'] },
    { secret: 'Bruce Lee', hint: 'The martial artist who became a global cinema icon', facts: ['Hong Kong-American martial artist, actor and filmmaker (1940–1973); widely regarded as the most influential martial artist of all time', 'Founded Jeet Kune Do — a martial arts philosophy emphasising practicality, fluidity and self-expression over rigid systems', 'His films Enter the Dragon (1973) and Fist of Fury sparked a global explosion of interest in martial arts and Asian cinema', 'Was capable of extraordinary physical feats: one-finger push-ups, snatching a coin from an open palm and replacing it in a single motion', 'Died suddenly aged 32 from cerebral oedema; his premature death remains one of cinema\'s most enduring mysteries'] },
    { secret: 'Amitabh Bachchan', hint: 'The "Shahenshah" of Bollywood', facts: ['Indian actor (born 1942); widely regarded as the greatest star in the history of Indian cinema', 'Known as "Big B" and the "Shahenshah (Emperor) of Bollywood"; his "angry young man" persona in Zanjeer (1973), Deewar (1975) and Sholay (1975) defined an era', 'Has appeared in over 200 films across more than 50 years — one of the longest and most celebrated careers in world cinema', 'Suffered a near-fatal abdominal injury on the set of Coolie (1982); the nation held its breath and millions prayed for his recovery', 'Revived his career in 2000 hosting India\'s Kaun Banega Crorepati (Who Wants to Be a Millionaire); the show became a cultural phenomenon'] },
    { secret: 'Jackie Chan', hint: 'The Hong Kong action star famous for daring stunts and physical comedy', facts: ['Hong Kong actor, filmmaker and martial artist (born 1954); known for blending acrobatic kung fu with slapstick comedy', 'Performs all his own stunts across over 150 films; has broken his nose, cheekbones, fingers, ankles, and sustained a skull fracture in the process', 'Began as a child stuntman; became a global superstar with Drunken Master (1978), Police Story (1985) and the Rush Hour series (from 1998)', 'His career spans over 55 years — one of the longest in cinema history; he is a major philanthropist donating half his fortune to charity', 'Received an honorary Academy Award in 2016 for "his extraordinary achievements in film"'] },
    { secret: 'Oprah Winfrey', hint: 'The first African-American female billionaire and TV\'s most powerful host', facts: ['American media mogul (born 1954); the first African-American female billionaire in history', 'Hosted The Oprah Winfrey Show for 25 years (1986–2011) — the highest-rated daytime talk show in television history, seen in 150 countries', 'Founded Harpo Productions and OWN (Oprah Winfrey Network); known for the "Oprah effect" — her book and product endorsements generate immediate sales surges', 'Overcame a profoundly difficult childhood marked by poverty and abuse to become one of the world\'s most influential people', 'Awarded the Presidential Medal of Freedom in 2013; her 2018 Golden Globes speech was widely seen as a potential presidential campaign launch'] },
    { secret: 'Diego Maradona', hint: 'The Argentine football genius behind the "Hand of God"', facts: ['Argentine footballer (1960–2020); one of the greatest players in football history alongside Pelé', 'Scored the infamous "Hand of God" goal against England in the 1986 World Cup quarter-final — punching the ball in with his fist but claiming divine help', 'His second goal that same match — dribbling past five players and the goalkeeper — was voted "Goal of the Century" by FIFA', 'Led Argentina to the 1986 World Cup and Napoli to its first-ever Italian league title in 1987, making him a deity in Naples', 'Died on 25 November 2020 aged 60 from a heart attack; Argentina declared a three-day national mourning period'] },
    { secret: 'Roger Federer', hint: 'The Swiss tennis maestro who won Wimbledon eight times', facts: ['Swiss tennis player (born 1981); widely regarded as one of the greatest tennis players in history', 'Won 20 Grand Slam singles titles; held the all-time record from 2018 until 2020', 'Ranked world No. 1 for 310 weeks total, including 237 consecutive weeks — a record that still stands', 'Won Wimbledon a record eight times, including five consecutively from 2003 to 2007', 'Retired in September 2022, with his final match a doubles at the Laver Cup alongside his great rival Rafael Nadal — a tearful farewell watched by millions'] },
    { secret: 'Serena Williams', hint: 'The tennis champion who won 23 Grand Slams and changed the sport', facts: ['American tennis player (born 1981); widely regarded as the greatest female tennis player of all time', 'Won a record 23 Grand Slam singles titles in the Open Era and held the world No.1 ranking for 319 weeks total', 'Won the 2017 Australian Open while eight weeks pregnant — one of sport\'s most remarkable achievements', 'Together with her sister Venus, transformed women\'s tennis with explosive power, redefining the athletic standards of the game', 'Retired from professional tennis in 2022 to focus on family and her venture capital firm Serena Ventures'] },
    { secret: 'Martin Luther King Jr', hint: 'The Baptist minister who led America\'s civil rights movement with "I Have a Dream"', facts: ['American Baptist minister and civil rights leader (1929–1968); the central figure of the US civil rights movement', 'Led the Montgomery Bus Boycott (1955–56) — a pivotal 381-day campaign that ended segregation on public buses', 'Delivered his iconic "I Have a Dream" speech to 250,000 people at the March on Washington on 28 August 1963', 'Won the Nobel Peace Prize in 1964 at age 35 — the youngest recipient at that time', 'Assassinated by James Earl Ray on 4 April 1968 in Memphis, Tennessee; the third Monday of January is now a US federal holiday in his honour'] },
    { secret: 'Malcolm X', hint: 'The fiery Black Muslim leader who advocated Black pride and self-defence', facts: ['African-American Muslim minister and civil rights activist (1925–1965); born Malcolm Little in Omaha, Nebraska', 'Joined the Nation of Islam in prison in the 1940s and rose to become its most prominent national spokesperson under Elijah Muhammad', 'Initially championed Black separatism and the right to self-defence — a sharp contrast to Martin Luther King\'s non-violence', 'After a transformative pilgrimage to Mecca in 1964, renounced racial separatism and embraced orthodox Sunni Islam', 'Assassinated on 21 February 1965 at the Audubon Ballroom in New York; his Autobiography (1965, with Alex Haley) is one of the 20th century\'s most influential books'] },
    { secret: 'Che Guevara', hint: 'The Argentine revolutionary whose face became the symbol of rebellion', facts: ['Argentine Marxist revolutionary and guerrilla leader (1928–1967); a key figure in the Cuban Revolution', 'An Argentinian doctor who became one of history\'s most iconic revolutionaries after witnessing poverty across Latin America', 'Played a crucial role in Fidel Castro\'s guerrilla campaign that overthrew Cuban dictator Batista on 1 January 1959', 'After the revolution, served as Cuba\'s Industry Minister before departing to foment revolution in Congo and Bolivia', 'Captured and executed by CIA-assisted Bolivian forces on 9 October 1967 aged 39; his iconic portrait by Alberto Korda became the world\'s most reproduced photograph'] },
    { secret: 'Fidel Castro', hint: 'Cuba\'s revolutionary leader who defied the USA for five decades', facts: ['Cuban revolutionary and political leader (1926–2016); Prime Minister 1959–1976 and President 1976–2008', 'Led the guerrilla revolution that overthrew US-backed dictator Fulgencio Batista on 1 January 1959', 'Survived an estimated 638 assassination attempts — many orchestrated by the CIA — making him one of history\'s most durable targets', 'His stand-off with the USA during the Cold War, including the Bay of Pigs (1961) and Cuban Missile Crisis (1962), made him an icon of anti-imperialism', 'Ruled Cuba for nearly 50 years; his brother Raúl succeeded him; Fidel died on 25 November 2016 aged 90'] },
    { secret: 'Yasser Arafat', hint: 'The Palestinian leader who symbolised his people\'s struggle for statehood', facts: ['Palestinian political leader (1929–2004); Chairman of the Palestine Liberation Organisation (PLO) from 1969 to 2004', 'Co-founded Fatah in the late 1950s; transformed the PLO into a major international political force', 'Shared the Nobel Peace Prize in 1994 with Yitzhak Rabin and Shimon Peres for the Oslo Accords — a landmark attempt at Israeli-Palestinian peace', 'His keffiyeh, olive-green uniform and distinctive stubble became among the world\'s most recognised political images', 'Died in a Paris hospital on 11 November 2004; subsequent tests suggested polonium poisoning, but no conclusion has been officially reached'] },
    { secret: 'Mother Teresa', hint: 'The "Saint of the Gutters" who served the poorest of the poor in Calcutta', facts: ['Albanian-Indian Catholic nun and missionary (1910–1997); born Anjezë Bojaxhiu in Skopje, Macedonia', 'Founded the Missionaries of Charity in Kolkata in 1950; grew it to 610 missions in 123 countries serving the sick, poor, orphaned and dying', 'Won the Nobel Peace Prize in 1979; donated the entire $192,000 prize directly to the poor, requesting no ceremonial banquet', 'Both admired as a saint and criticised for conditions in her homes and views on birth control and medical care', 'Canonised as Saint Teresa of Calcutta by Pope Francis on 4 September 2016, just 19 years after her death — exceptionally fast by Vatican standards'] },
    { secret: 'Lech Wałęsa', hint: 'The Polish electrician who led Solidarity and peacefully toppled communism', facts: ['Polish trade union leader and statesman (born 1943); a shipyard electrician who became the face of Poland\'s peaceful anti-communist revolution', 'Founded and led Solidarity (Solidarność) in 1980 — the first independent trade union in the Soviet bloc, with 10 million members within a year', 'Imprisoned after Poland declared martial law in December 1981; his defiance from prison became a global symbol', 'Won the Nobel Peace Prize in 1983; refused to travel to Oslo to collect it fearing the Polish government would bar his return', 'Led negotiations that ended communist rule in Poland in 1989 and became Poland\'s President (1990–1995); credited as a key architect of Eastern Europe\'s peaceful liberation'] },
    { secret: 'Steve Jobs', hint: 'The Apple co-founder who gave us the iPhone, iPod and Pixar', facts: ['American entrepreneur and co-founder of Apple Inc. (1955–2011); born in San Francisco and adopted as an infant', 'Co-founded Apple in a garage in 1976 with Steve Wozniak; forced out in 1985 then returned in 1997 to rescue a near-bankrupt company', 'Oversaw the launch of the iMac (1998), iPod (2001), iTunes (2001), iPhone (2007) and iPad (2010) — transforming music, phones and personal computing', 'Also founded Pixar Animation Studios, which produced Toy Story (1995) — the first entirely computer-animated feature film', 'Died on 5 October 2011 from pancreatic cancer; his 2005 Stanford commencement speech — "Stay hungry, stay foolish" — remains one of history\'s most watched'] },
    { secret: 'Jeff Bezos', hint: 'The Amazon founder who built the world\'s largest online store from his garage', facts: ['American entrepreneur (born 1964); founder of Amazon and one of the world\'s wealthiest people', 'Founded Amazon in 1994 in his Bellevue garage as an online bookstore; grew it into the world\'s largest e-commerce and cloud computing company', 'Expanded Amazon into AWS (cloud services), Kindle (e-books), Alexa (voice AI), Prime Video and same-day delivery — disrupting entire industries', 'Stepped down as Amazon CEO in July 2021 after 27 years to focus on his aerospace company Blue Origin', 'Flew to space aboard Blue Origin\'s New Shepard rocket in July 2021; aspires to make space travel routine for future generations'] },
    { secret: 'Bill Gates', hint: 'The Microsoft co-founder who put a computer on every desk', facts: ['American entrepreneur (born 1955); co-founded Microsoft with Paul Allen in 1975 from a Harvard dorm room', 'Microsoft\'s MS-DOS (1980) and Windows (1985 onwards) became the world\'s dominant personal computer software — making Gates the world\'s richest person through the 1990s', 'His famous 1995 memo "The Internet Tidal Wave" redirected Microsoft\'s entire strategy toward the internet', 'Left Microsoft\'s day-to-day operations in 2008 to focus on the Bill & Melinda Gates Foundation — which has committed over $60 billion to global health and poverty', 'The Foundation\'s work on polio eradication, malaria and vaccine distribution is credited with saving millions of lives'] },
    { secret: 'Walt Disney', hint: 'The visionary who created Mickey Mouse and built the world\'s first theme park', facts: ['American animator and entrepreneur (1901–1966); co-founder of The Walt Disney Company', 'Created Mickey Mouse in 1928 with Steamboat Willie — one of the first cartoons with synchronised sound; Mickey became the most recognised fictional character in the world', 'Produced Snow White and the Seven Dwarfs (1937) — the first feature-length animated film in history, which critics had called "Disney\'s Folly"', 'Built Disneyland in Anaheim, California (1955) — the world\'s first modern theme park, personally supervising every detail of its design', 'Won a record 22 competitive Academy Awards from 59 nominations — the most by any individual; also won four honorary Oscars'] },
    { secret: 'Jack Ma', hint: 'The former English teacher who built China\'s e-commerce empire', facts: ['Chinese entrepreneur (born 1964); co-founder of Alibaba Group — China\'s largest e-commerce company', 'Rejected by Harvard Business School ten times; also rejected by KFC when 24 people applied and 23 were hired — he was the only one turned down', 'Founded Alibaba in 1999 from his Hangzhou apartment with 17 friends; it grew into a company worth over $800 billion at its peak', 'Founded Alipay, now part of Ant Group — one of the world\'s largest mobile payment platforms with over 1 billion users', 'Disappeared from public view after a 2020 speech criticising Chinese financial regulators; widely seen as a warning about limits for Chinese entrepreneurs'] },
    { secret: 'Henry Ford', hint: 'The industrialist who put the world on wheels with the Model T', facts: ['American industrialist (1863–1947); founder of Ford Motor Company', 'Introduced the moving assembly line for car production in 1913, cutting the time to build a Model T from 12 hours to 93 minutes', 'The Model T (1908–1927) was the first mass-produced, affordable car; over 15 million were built and it put America on wheels', 'Introduced the $5 workday in 1914 — double the going rate — reducing turnover and enabling workers to buy the cars they made', 'His manufacturing methods ("Fordism") transformed industrial production worldwide and shaped the entire 20th-century economy'] },
    { secret: 'Pablo Picasso', hint: 'The Spanish artist who co-founded Cubism and painted Guernica', facts: ['Spanish painter and sculptor (1881–1973); one of the most influential and prolific artists of the 20th century', 'Co-founded Cubism with Georges Braque — a revolutionary movement that shattered conventional perspective and transformed modern art', 'Created Guernica (1937) — a monumental black-and-white canvas depicting the Nazi bombing of a Basque town; one of history\'s most powerful anti-war paintings', 'Produced an extraordinary estimated 20,000 artworks across painting, sculpture, ceramics, drawing and printmaking', 'Recognised as a prodigy at 13; his full baptismal name had 23 words; remained creatively active until his death aged 91'] },
    { secret: 'Noam Chomsky', hint: 'The linguist and political dissident called the most cited living author', facts: ['American linguist and political philosopher (born 1928); widely called "the father of modern linguistics"', 'Revolutionised linguistics with his theory of generative grammar — arguing humans are born with an innate language acquisition device', 'His 1959 review demolishing B.F. Skinner\'s behaviourist theory of language is one of academia\'s most influential texts', 'A prolific political activist who has consistently critiqued US foreign policy, corporate media, and global capitalism for over 60 years', 'Often cited as "the most cited living author" in academic literature across linguistics, philosophy and political science'] },
    { secret: 'Alexander the Great', hint: 'A Macedonian king who conquered half the known world by age 30', facts: ['Macedonian king (356–323 BC) who built one of the largest empires in history by age 30', 'Tutored by the philosopher Aristotle from age 13 to 16', 'Never lost a single battle in over 15 years of campaigning, from Greece to northwestern India', 'Founded over 20 cities bearing his name, most famously Alexandria in Egypt', 'Died aged 32 in Babylon — cause unknown; theories include typhoid, alcohol poisoning and assassination'] },
    { secret: 'Julius Caesar', hint: 'The Roman general stabbed on the Ides of March', facts: ['Roman general and statesman (100–44 BC) who transformed Rome from republic toward empire', 'Conquered Gaul (modern France) from 58–50 BC in one of history\'s most consequential military campaigns', 'Crossed the Rubicon with his army in 49 BC — defying Roman law — giving us the idiom "crossing the Rubicon"', 'Gave his name to the Julian Calendar (46 BC), the basis of our modern Gregorian calendar', 'Assassinated on 15 March 44 BC (the Ides of March) by senators including his close friend Brutus; stabbed 23 times'] },
    { secret: 'Genghis Khan', hint: 'The Mongol warlord who built the largest land empire in history', facts: ['Born Temüjin around 1162; united the Mongol tribes and took the title "Genghis Khan" (Universal Ruler) in 1206', 'Built the largest contiguous land empire in history — stretching from the Pacific to Eastern Europe', 'His campaigns killed an estimated 40 million people — roughly 10% of the global population at the time', 'The Pax Mongolica enabled unprecedented trade and travel across Eurasia along the Silk Road', 'DNA studies suggest up to 16 million men alive today are direct descendants of Genghis Khan'] },
    { secret: 'Christopher Columbus', hint: 'The explorer whose 1492 voyage changed the world forever', facts: ['Italian navigator (1451–1506) sailing under the Spanish Crown who reached the Americas on 12 October 1492', 'Sailed on the Niña, Pinta and Santa María; made landfall on a Bahamian island he named San Salvador', 'Made four voyages to the Americas (1492–1504) but always believed he had reached Asia — he died without knowing otherwise', 'His voyages triggered the Columbian Exchange — the transfer of plants, animals, culture and disease between the Old and New Worlds', 'Inaugurated an era of European colonisation that reshaped every continent on Earth'] },
    { secret: 'Charles Darwin', hint: 'The naturalist whose theory of evolution changed how we understand life', facts: ['British naturalist (1809–1882) who developed the theory of evolution by natural selection', 'His 1831–36 voyage on HMS Beagle, including time in the Galápagos Islands, provided key evidence for his ideas', 'Published On the Origin of Species in 1859 — one of the most influential scientific books ever written', 'Argued that all species evolve gradually through the survival of those best adapted to their environment', 'His theory remains the cornerstone of all modern biology, genetics and medicine'] },
    { secret: 'Galileo Galilei', hint: 'The Italian astronomer put under house arrest for saying Earth orbits the Sun', facts: ['Italian astronomer and physicist (1564–1642); called "the father of modern science"', 'Used an improved telescope to discover Jupiter\'s four largest moons, the phases of Venus and mountains on the Moon', 'His observations provided powerful evidence that the Earth orbits the Sun — contradicting Church doctrine', 'Tried by the Roman Inquisition in 1633 and forced to recant; placed under house arrest for the rest of his life', 'Allegedly whispered "And yet it moves" after his forced recantation — a line beloved by scientists ever since'] },
    { secret: 'Florence Nightingale', hint: 'The "Lady with the Lamp" who founded modern nursing', facts: ['British nurse and social reformer (1820–1910); founder of modern nursing', 'During the Crimean War (1854–56), organised hospital care in Scutari, reducing the death rate from 42% to 2%', 'Pioneered the use of statistical graphics — her polar area diagrams persuaded the government to improve sanitation', 'Known as "the Lady with the Lamp" for walking hospital wards at night checking on patients by lamplight', 'Published Notes on Nursing (1859); became the first woman awarded the Order of Merit in 1907'] },
    { secret: 'Anne Frank', hint: 'A Jewish teenager whose diary became the world\'s most read Holocaust testimony', facts: ['German-born Jewish girl (1929–1945) who hid with her family in Amsterdam for over two years during the Nazi occupation', 'Her diary, written June 1942–August 1944, describes life hiding in the Secret Annex of her father\'s office building', 'The family was betrayed and arrested in August 1944; Anne died in Bergen-Belsen concentration camp aged 15', 'Her father Otto — the only family member to survive — found her diary and published it in 1947', 'The Diary of a Young Girl has been translated into over 70 languages and sold over 35 million copies'] },
    { secret: 'Sigmund Freud', hint: 'The founder of psychoanalysis who mapped the unconscious mind', facts: ['Austrian neurologist (1856–1939); founder of psychoanalysis — a clinical method for treating psychological disorders', 'Developed the theory that unconscious thoughts and repressed experiences shape behaviour and personality', 'Introduced enduring concepts: the ego, id, superego, Oedipus complex and the "talking cure"', 'Fled Nazi-occupied Vienna to London in 1938; died there in 1939 of oral cancer', 'Though most of his specific theories are now disputed, his cultural influence on psychology, literature and popular thought is immense'] },
    { secret: 'Jawaharlal Nehru', hint: 'India\'s first Prime Minister who pledged a "Tryst with Destiny"', facts: ['First Prime Minister of independent India (1947–1964); close ally of Mahatma Gandhi', 'Delivered his famous "Tryst with Destiny" speech at midnight on 14–15 August 1947 as India gained independence', 'A champion of non-alignment — refused to join either the US or Soviet bloc during the Cold War', 'Founded the Indian Institutes of Technology (IITs), which became global centres of engineering excellence', 'His daughter Indira Gandhi and grandson Rajiv Gandhi both later served as Prime Ministers of India'] },
    { secret: 'Indira Gandhi', hint: 'India\'s first female Prime Minister, killed by her own bodyguards', facts: ['First and only female Prime Minister of India, serving 1966–77 and 1980–84; daughter of Jawaharlal Nehru', 'Led India to a decisive victory in the 1971 war that created the new nation of Bangladesh', 'Declared a State of Emergency (1975–77), suspending civil liberties — the most controversial act of her rule', 'Ordered Operation Blue Star in June 1984 — a military assault on the Golden Temple to remove Sikh militants', 'Assassinated on 31 October 1984 by two of her Sikh bodyguards in retaliation for Operation Blue Star'] },
    { secret: 'Queen Victoria', hint: 'Britain\'s longest-reigning 19th-century queen who gave her name to an era', facts: ['British monarch (1819–1901); reigned 1837–1901 — then the longest reign in British history at 63 years', 'Presided over the British Empire at its height, when it covered a quarter of the Earth\'s surface', 'Became the first Empress of India in 1876; spoke Hindi and had an Indian attendant, Abdul Karim', 'Married her first cousin Prince Albert; their nine children married into royal families across Europe', 'Went into prolonged mourning after Albert\'s death in 1861, always wearing black; the public called her "the Widow of Windsor"'] },
    { secret: 'Henry VIII', hint: 'The English king with six wives who broke from the Pope', facts: ['King of England 1509–1547; the second Tudor monarch', 'Had six wives: Catherine of Aragon, Anne Boleyn, Jane Seymour, Anne of Cleves, Catherine Howard, Catherine Parr', 'Their fates: "Divorced, Beheaded, Died, Divorced, Beheaded, Survived"', 'Broke from the Roman Catholic Church in 1534, declaring himself Supreme Head of the Church of England, after the Pope refused to annul his first marriage', 'Ordered the dissolution of England\'s monasteries, seizing their vast wealth — one of the largest property transfers in English history'] },
    { secret: 'Michelangelo', hint: 'The Renaissance genius who sculpted David and painted the Sistine Chapel ceiling', facts: ['Italian Renaissance artist (1475–1564); among the greatest sculptors and painters in history', 'Carved the marble David (1501–04) — 5.17 metres tall — considered the perfect depiction of the human male form', 'Painted the Sistine Chapel ceiling (1508–12) at the Vatican, working on scaffolding for four years', 'Also designed the dome of St Peter\'s Basilica in Rome, which influenced dome architecture worldwide', 'Lived to 88 — remarkable for the era — and worked on sculpture until days before his death'] },
    { secret: 'Ludwig van Beethoven', hint: 'The German composer who wrote his greatest works while deaf', facts: ['German composer (1770–1827); one of the most influential musicians in Western history', 'Composed nine symphonies, five piano concertos and a vast body of chamber and piano music', 'Began losing his hearing in his mid-twenties; was almost completely deaf when he composed his Ninth Symphony', 'His Ninth Symphony (1824) — with its choral Ode to Joy finale — was composed when he was totally deaf; he had to be turned to face the audience to see their applause', 'Bridged the Classical and Romantic eras; his late works broke every convention of form and expression'] },
    { secret: 'Freddie Mercury', hint: 'The flamboyant lead singer of Queen who wrote Bohemian Rhapsody', facts: ['Born Farrokh Bulsara in Zanzibar in 1946; lead vocalist and primary lyricist of the rock band Queen', 'Possessed an extraordinary vocal range covering about four octaves and a legendary live performance energy', 'Wrote Bohemian Rhapsody (1975) — a six-minute operatic rock epic voted the greatest British song of all time', 'Queen\'s performance at Live Aid in Wembley (1985) is widely considered the greatest live rock performance in history', 'Died on 24 November 1991 from AIDS-related bronchopneumonia, just one day after publicly announcing his diagnosis'] },
    { secret: 'John Lennon', hint: 'The Beatle who wrote Imagine and was shot outside his New York home', facts: ['English singer-songwriter (1940–1980); co-founder of The Beatles — history\'s most successful band', 'Co-wrote with Paul McCartney rock classics including Let It Be, Hey Jude and Come Together', 'His 1971 solo song Imagine — a call for a peaceful, borderless world — is one of the best-selling singles in history', 'A prominent peace activist; his "Bed-Ins for Peace" protests with Yoko Ono drew worldwide attention', 'Shot and killed by Mark David Chapman outside his New York apartment on 8 December 1980, aged 40'] },
    { secret: 'Bob Marley', hint: 'The reggae legend who made Jamaican music a global force', facts: ['Jamaican reggae singer and songwriter (1945–1981); the most globally recognised figure in reggae music history', 'His 1977 album Exodus was named Album of the Century by Time magazine', 'Songs including No Woman No Cry, One Love, Redemption Song and Get Up, Stand Up became global anthems of peace and freedom', 'A devout Rastafarian; his music carried messages of resistance, spirituality and Pan-African identity', 'Died from cancer aged 36 in 1981; one of the best-selling artists ever with over 75 million records sold'] },
    { secret: 'Marilyn Monroe', hint: 'Hollywood\'s most iconic actress who sang Happy Birthday to the President', facts: ['Born Norma Jeane Mortenson in 1926; the defining sex symbol and cultural icon of 1950s Hollywood', 'Starred in Some Like It Hot (1959), Gentlemen Prefer Blondes (1953) and The Misfits (1961)', 'Sang a breathy "Happy Birthday, Mr. President" to John F. Kennedy at Madison Square Garden in May 1962', 'Her marriages included baseball legend Joe DiMaggio and playwright Arthur Miller', 'Found dead on 4 August 1962 aged 36 from a barbiturate overdose; the circumstances have fuelled decades of fascination'] },
    { secret: 'Coco Chanel', hint: 'The French designer who liberated women from the corset and created Chanel No. 5', facts: ['French fashion designer (1883–1971); founder of the Chanel brand — one of the world\'s most recognised luxury labels', 'Revolutionised women\'s fashion by replacing corsets and elaborate ornamentation with simple, comfortable, elegant clothing', 'Created the little black dress (1926) and launched Chanel No. 5 perfume (1921) — still the world\'s best-selling fragrance', 'Introduced jersey fabric, women\'s trousers and costume jewellery into mainstream fashion', 'Her wartime behaviour in Nazi-occupied Paris — living at the Ritz Hotel — remains controversial'] },
    { secret: 'Yuri Gagarin', hint: 'The first human to travel to outer space', facts: ['Soviet cosmonaut (1934–1968); on 12 April 1961 became the first human being to travel to outer space', 'His spacecraft Vostok 1 completed one full orbit of the Earth in 108 minutes', 'Before launch, reportedly said "Poyekhali!" (Let\'s go!) — one of history\'s great understated moments', 'Returned safely and became an overnight international celebrity and icon of the Space Race', 'Died in a routine jet training accident on 27 March 1968 aged 34 — less than two years before the Moon landing he never lived to see'] },
    { secret: 'Elon Musk', hint: 'The entrepreneur behind Tesla, SpaceX and X (formerly Twitter)', facts: ['South African-born American entrepreneur (born 1971); co-founded PayPal before founding SpaceX and Tesla', 'SpaceX in 2020 became the first private company to send astronauts to the International Space Station', 'Tesla transformed the automotive industry by proving electric cars could be practical and desirable', 'Bought Twitter for $44 billion in 2022, rebranded it as X — one of the most controversial tech acquisitions in history', 'Has been the world\'s wealthiest person; his net worth fluctuates dramatically with Tesla\'s share price'] },
    { secret: 'J.K. Rowling', hint: 'The author who created Harry Potter while a struggling single mother', facts: ['British author (born 1965); creator of the Harry Potter series — the best-selling book series in history', 'Conceived the idea for Harry Potter on a delayed train journey from Manchester to London in 1990', 'Was a single mother on welfare when she wrote the first novel, rejected by 12 publishers before finding one', 'The series has sold over 600 million copies and been translated into 84 languages', 'Her estimated net worth exceeds £1 billion; one of very few authors ever to become a billionaire from book writing'] },
    { secret: 'Agatha Christie', hint: 'The world\'s best-selling crime novelist who created Poirot and Miss Marple', facts: ['British crime writer (1890–1976); the best-selling fiction writer of all time', 'Wrote 66 detective novels and 14 short story collections featuring Hercule Poirot and Miss Marple', 'Her works have sold an estimated 2 billion copies — outsold only by the Bible and Shakespeare', 'And Then There Were None (1939) is the world\'s best-selling mystery novel with over 100 million copies sold', 'Mysteriously disappeared for 11 days in December 1926; found in a spa hotel in Harrogate — she never explained what happened'] },
    { secret: 'Ernest Hemingway', hint: 'The Nobel Prize-winning American novelist known for spare, powerful prose', facts: ['American novelist (1899–1961); one of the most influential writers of the 20th century', 'Famous novels include A Farewell to Arms (1929), For Whom the Bell Tolls (1940) and The Old Man and the Sea (1952)', 'His direct, economical prose style revolutionised English literary writing', 'Led an adventurous life: WWI ambulance driver, war correspondent, big-game hunter, deep-sea fisherman', 'Won the Nobel Prize in Literature in 1954; took his own life in 1961 at his home in Ketchum, Idaho'] },
    { secret: 'Salvador Dalí', hint: 'The eccentric Spanish Surrealist who painted melting clocks', facts: ['Spanish Surrealist painter (1904–1989); one of the most recognisable and flamboyant artists of the 20th century', 'His most famous work, The Persistence of Memory (1931) — with its drooping clocks — is one of the world\'s most reproduced paintings', 'Known for his extravagant personality and curling moustache as much as his art', 'Collaborated with directors Luis Buñuel and Alfred Hitchcock (Spellbound dream sequence, 1945)', 'The Dalí Theatre-Museum in Figueres, Spain — designed by Dalí himself — is the world\'s largest Surrealist object'] },
    { secret: 'Frida Kahlo', hint: 'The Mexican painter who transformed personal suffering into iconic self-portraits', facts: ['Mexican painter (1907–1954); one of the most celebrated artists of the 20th century', 'Survived a devastating bus accident at 18 that shattered her spine; began painting seriously during her long recovery', 'Created 55 self-portraits among her 143 paintings — deeply personal explorations of pain, identity and sexuality', 'Married (twice) to muralist Diego Rivera; their passionate, turbulent relationship defined both their lives and art', 'A global feminist icon; her image now appears on Mexico\'s 500 peso note'] },
    { secret: 'Elton John', hint: 'The flamboyant British pop star whose Candle in the Wind became the best-selling single ever', facts: ['British singer-songwriter and pianist (born 1947); one of the best-selling music artists in history with over 300 million records sold', 'Known for flamboyant costumes, oversized glasses and spectacular live shows', 'Classics include Rocket Man, Tiny Dancer, Your Song and Crocodile Rock; songwriting partner Bernie Taupin wrote the lyrics', 'Wrote the music for The Lion King (1994); received multiple Oscars, Grammys and a Tony', 'His 1997 re-recording of Candle in the Wind for Princess Diana\'s funeral became the best-selling physical single ever at over 33 million copies'] },
    { secret: 'David Bowie', hint: 'The rock chameleon who reinvented himself as Ziggy Stardust and beyond', facts: ['British rock musician (1947–2016); one of the most influential figures in popular music history', 'Reinvented himself repeatedly — as Ziggy Stardust, Aladdin Sane, the Thin White Duke — making reinvention his defining artistic statement', 'Albums including Ziggy Stardust (1972), Heroes (1977) and Let\'s Dance (1983) each defined their era', 'Influenced fashion, glam rock and gender expression; his androgynous style challenged norms in the 1970s', 'Released his final album Blackstar on his 69th birthday, 8 January 2016; died of liver cancer two days later, to worldwide shock'] },
    { secret: 'Beyoncé', hint: 'The pop queen who headlined Coachella and broke Grammy records', facts: ['American singer-songwriter (born 1981); one of the most acclaimed and decorated musicians in history', 'Began in Destiny\'s Child before becoming arguably the most influential solo pop performer of her generation', 'Her visual album Lemonade (2016) — exploring Black womanhood and resilience — was praised as a cultural masterpiece', 'Has more Grammy nominations and wins than any other female artist in Grammy history', 'Her Renaissance World Tour (2023) became one of the highest-grossing concert tours ever'] },
    { secret: 'LeBron James', hint: 'Basketball\'s all-time leading scorer who won championships with three different teams', facts: ['American basketball player (born 1984); widely regarded as one of the two greatest basketball players of all time', 'Became the all-time NBA scoring leader in January 2023, surpassing Kareem Abdul-Jabbar\'s 38-year-old record', 'Won four NBA Championships with three different franchises — Miami Heat, Cleveland Cavaliers and Los Angeles Lakers', 'Led Cleveland to their first NBA title in 2016, ending the city\'s 52-year major sports championship drought', 'His LeBron James Family Foundation has funded college scholarships and a public school in his hometown of Akron, Ohio'] },
    { secret: 'Tiger Woods', hint: 'The golfer who dominated his sport for two decades and won 15 Majors', facts: ['American golfer (born 1975); widely regarded as the greatest golfer in history', 'Won 15 Major championships — second only to Jack Nicklaus\'s record of 18', 'First golfer of African-American or Asian heritage to win the Masters (1997), which he won by a record 12 strokes at age 21', 'Held the world No.1 ranking for a total of 683 weeks — more than any other golfer in history', 'His 2019 Masters victory — after years of surgeries and personal scandal — was widely hailed as sport\'s greatest comeback'] },
    { secret: 'Mike Tyson', hint: 'The youngest heavyweight boxing champion in history, feared for his ferocious punching power', facts: ['American boxer (born 1966); became the undisputed heavyweight champion and the youngest heavyweight champion in history at age 20', 'His ferocious punching power and defensive head movement made him nearly unbeatable in his prime', 'Knocked out 44 opponents in his professional career; 12 in the first round', 'Served three years in prison (1992–95) after a rape conviction he has always disputed', 'His 1997 rematch with Evander Holyfield became notorious when Tyson bit off a portion of Holyfield\'s ear during the fight'] },
    { secret: 'Confucius', hint: 'The Chinese philosopher whose ideas shaped 2,000 years of East Asian civilisation', facts: ['Chinese philosopher (551–479 BC); his teachings, Confucianism, profoundly shaped Chinese and East Asian civilisation', 'Emphasised virtues of benevolence (ren), ritual propriety (li) and moral self-cultivation as paths to a harmonious society', 'His sayings were compiled by disciples into the Analects — one of the most influential philosophical texts in history', 'For over 2,000 years, Chinese civil service exams tested candidates on Confucian texts, shaping the entire governing class', 'His ideas on family loyalty, education and ethical leadership remain deeply influential across East Asia today'] },
    { secret: 'The Buddha (Siddhartha Gautama)', hint: 'The Indian prince who abandoned his palace and founded Buddhism', facts: ['An Indian prince (c.563–483 BC) who renounced a life of royal luxury to seek the end of human suffering', 'Achieved enlightenment while meditating under a Bodhi tree in Bodh Gaya, India, after 49 days', 'Founded Buddhism — now the world\'s fourth-largest religion with around 520 million followers', 'His core teachings — the Four Noble Truths and the Eightfold Path — offer a path to freedom from suffering', 'Buddhism spread from India across all of Asia; the Buddha\'s image is the most widely reproduced human likeness in history'] },
    { secret: 'Aristotle', hint: 'The ancient Greek philosopher who tutored Alexander the Great and wrote on almost everything', facts: ['Ancient Greek philosopher (384–322 BC); student of Plato and tutor to the young Alexander the Great', 'Made foundational contributions to logic, metaphysics, biology, ethics, politics, rhetoric and poetry', 'His classification of animals — Historia Animalium — remained the definitive zoology text for nearly 2,000 years', 'His Nicomachean Ethics introduced eudaimonia (flourishing) as the highest human good — still debated in philosophy today', 'His works were preserved in the Islamic world and reintroduced to medieval Europe through Arab scholars, shaping Christian philosophy'] },
    { secret: 'Saladin', hint: 'The Muslim sultan who recaptured Jerusalem from the Crusaders and became a chivalric legend', facts: ['Kurdish Muslim military leader (1137–1193); Sultan of Egypt and Syria and founder of the Ayyubid dynasty', 'United the Muslim world of the Levant and Egypt through military skill and political acumen', 'Captured Jerusalem from the Crusaders on 2 October 1187 — 88 years after the First Crusade had taken it', 'Famous for his chivalrous treatment of defeated Crusaders — sparing lives and allowing safe passage', 'Respected even by Crusader leaders including Richard I of England, who negotiated peace with him'] },
    { secret: 'Suleiman the Magnificent', hint: 'The Ottoman Sultan whose empire stretched from Budapest to Baghdad', facts: ['Ottoman sultan (1494–1566); the longest-reigning sultan of the Ottoman Empire at the height of its power', 'His empire at its peak stretched from Hungary in Europe to Yemen in Arabia and from Iran\'s border to Algeria', 'Known in the Islamic world as "the Lawgiver" (Kanuni) for his sweeping legal reforms and codification of Ottoman law', 'Under his patronage Istanbul\'s great mosques — including the Süleymaniye — were built by the architect Sinan', 'Led the Siege of Vienna (1529) — his only major military failure; his army retreated after failing to take the city'] },
    { secret: 'Catherine the Great', hint: 'The German-born Empress who made Russia a great European power', facts: ['German-born Empress of Russia (1729–1796); reigned 1762–1796 — the longest-ruling female leader in Russian history', 'Seized power in a coup that deposed her husband Peter III; styled herself a student of the Enlightenment', 'Expanded Russian territory dramatically, annexing Crimea and parts of Poland, and founded dozens of new cities', 'A patron of arts and culture who corresponded with Voltaire and Diderot; founded the Hermitage Museum in St Petersburg', 'Her reign is called Russia\'s "Golden Age" of culture; she is considered one of Russia\'s greatest rulers'] },
    { secret: 'Rosa Parks', hint: 'The seamstress who refused to give up her bus seat and sparked the US civil rights movement', facts: ['African-American civil rights activist (1913–2005); called "the mother of the freedom movement"', 'On 1 December 1955 in Montgomery, Alabama, refused to give up her bus seat to a white passenger as the law required', 'Her arrest triggered the Montgomery Bus Boycott — a 381-day campaign that ended bus segregation in the city', 'Martin Luther King Jr. led the boycott, which catapulted him to national prominence; Parks\' act was its catalyst', 'Awarded the Presidential Medal of Freedom (1996) and the Congressional Gold Medal (1999) — the USA\'s two highest civilian honours'] },
    { secret: 'Malala Yousafzai', hint: 'The Pakistani girl shot by the Taliban who became the youngest Nobel Peace Prize laureate', facts: ['Pakistani education activist (born 1997); the youngest person ever to receive the Nobel Peace Prize (2014)', 'Grew up in Pakistan\'s Swat Valley; began blogging for the BBC aged 11 about the Taliban\'s ban on girls\' education', 'Shot in the head by a Taliban gunman on her school bus on 9 October 2012; survived after emergency surgery in the UK', 'Her memoir I Am Malala (2013) became an international bestseller', 'Founded the Malala Fund, a global charity working to ensure 12 years of free, quality education for every girl'] },
    { secret: 'Marco Polo', hint: 'The Venetian explorer who introduced Europe to the wonders of China', facts: ['Venetian merchant and explorer (c.1254–1324) who travelled from Italy to China and spent 17 years in Asia', 'Served Kublai Khan — the Mongol ruler of China — as a special envoy and diplomat', 'His account The Travels of Marco Polo described China\'s wealth and wonders to astonished Europeans', 'Many disbelieved his tales of vast Chinese cities, paper money and black stones that burned (coal)', 'His accounts inspired Columbus and other explorers; he is considered one of history\'s greatest travellers'] },
    { secret: 'Attila the Hun', hint: 'The "Scourge of God" who terrorised the Roman Empire', facts: ['Ruler of the Hunnic Empire (406–453 AD); one of the most feared leaders of the late Roman era', 'Called the "Scourge of God" by medieval Europeans for his devastating raids across the Roman Empire', 'At his peak, his empire stretched from the Rhine to the Caspian Sea — modern France to Kazakhstan', 'Defeated the Western Roman army at the Battle of the Catalaunian Plains (451 AD) but ultimately failed to conquer the West', 'Died mysteriously on his wedding night in 453 AD — historical accounts suggest he choked on blood from a severe nosebleed'] },
    { secret: 'Neil Armstrong', hint: 'The first human to walk on the Moon', facts: ['American astronaut (1930–2012); on 20 July 1969 became the first human being to walk on the Moon', 'Commander of Apollo 11; piloted the Eagle lunar module to a landing in the Sea of Tranquillity', 'His words on stepping onto the lunar surface: "That\'s one small step for man, one giant leap for mankind"', 'A former US Navy pilot who flew 78 combat missions during the Korean War before joining NASA', 'After NASA, he shunned celebrity and taught aerospace engineering at the University of Cincinnati, living quietly until his death in 2012'] },
    { secret: 'Valentina Tereshkova', hint: 'The first woman to travel to space, in 1963', facts: ['Soviet cosmonaut (born 1937); on 16 June 1963 became the first woman in space — and the only woman to fly a solo space mission', 'Flew aboard Vostok 6, completing 48 orbits of the Earth in 70 hours and 50 minutes', 'Before selection, she was a textile factory worker and amateur parachutist with no pilot training', 'Launched just two years after Yuri Gagarin\'s flight; the USSR did not send another woman to space for 19 years', 'Became a Soviet politician and member of the Duma; in 2013 she offered to go on a one-way mission to Mars if given the chance'] },
    { secret: 'John Glenn', hint: 'The first American to orbit Earth, who later flew again at age 77', facts: ['American astronaut and politician (1921–2016); on 20 February 1962 became the first American to orbit the Earth', 'His Friendship 7 capsule completed three orbits in 4 hours 55 minutes; the nation held its breath throughout', 'A decorated Marine Corps fighter pilot who flew 149 combat missions in WWII and Korea', 'In 1998, aged 77, returned to space aboard Space Shuttle Discovery — becoming the oldest person ever to fly in space', 'Served as US Senator from Ohio for 24 years (1974–1999); received the Presidential Medal of Freedom in 2012'] },
    { secret: 'Kenny Rogers', hint: 'The country music legend who told you when to hold \'em and when to fold \'em', facts: ['American country music singer and actor (1938–2020); one of the best-selling music artists of all time with over 120 million records sold', 'Known for The Gambler (1978), Lucille (1977), Lady (1980) and Islands in the Stream (1983, a duet with Dolly Parton)', 'The Gambler became his signature song — its advice ("You gotta know when to hold \'em, know when to fold \'em") became a cultural proverb', 'Won three Grammy Awards including a Lifetime Achievement Award in 2013', 'Also a successful actor: played the character Brady Hawkes in a series of popular TV movies based on The Gambler'] },
    { secret: 'Robert Redford', hint: 'The Hollywood star who founded the Sundance Film Festival', facts: ['American actor and filmmaker (born 1936); one of Hollywood\'s most enduring leading men', 'Famous roles include The Sting (1973) and Butch Cassidy and the Sundance Kid (1969) — both with Paul Newman', 'Won the Academy Award for Best Director for Ordinary People (1980)', 'Founded the Sundance Film Festival in Utah in 1978, which grew into the most important independent film festival in the world', 'A committed environmentalist; co-founded the Natural Resources Defense Council and has long campaigned for conservation of the American West'] },
    { secret: 'Paul Newman', hint: 'The Hollywood icon who became a legendary philanthropist through his food brand', facts: ['American actor and filmmaker (1925–2008); one of Hollywood\'s greatest stars', 'Famous roles include Cool Hand Luke (1967), Butch Cassidy and the Sundance Kid (1969) and The Color of Money (1986)', 'Won the Academy Award for Best Actor for The Color of Money (1986); received an honorary Oscar in 1986 for his dedication to his craft', 'Also a serious racing car driver — competed at the 24 Hours of Le Mans; finished second in class aged 70', 'Founded Newman\'s Own food company in 1982, donating all profits to charity; has donated over $570 million to charitable causes to date'] },
    { secret: 'King Faisal of Saudi Arabia', hint: 'The Saudi king who led the 1973 Arab oil embargo and modernised his kingdom', facts: ['King of Saudi Arabia from 1964 until his assassination on 25 March 1975', 'Modernised Saudi Arabia by establishing schools (including girls\' schools), hospitals and television — despite initial conservative opposition', 'Led the Arab oil embargo of 1973 against Western nations supporting Israel in the Yom Kippur War, quadrupling oil prices and transforming global geopolitics', 'Ruled with religious conservatism balanced by pragmatic modernisation; earned respect across the Arab and Islamic world', 'Assassinated by his nephew Prince Faisal bin Musaid during a public audience; widely mourned across the Muslim world as a sincere and capable leader'] },
    { secret: 'Novak Djokovic', hint: 'The Serbian tennis player with more Grand Slam titles than anyone in history', facts: ['Serbian tennis player (born 1987); holds the all-time record for most Grand Slam singles titles in history with 24 (as of 2024)', 'Has won all four Grand Slams: Australian Open (a record 10 times), French Open (3), Wimbledon (7) and US Open (4)', 'Has held the world No. 1 ranking for a record total exceeding 400 weeks', 'Known for his extraordinary court coverage, flexibility and mental resilience — often considered the greatest ever returner of serve', 'His rivalry with Roger Federer and Rafael Nadal defined the "Big Three" era — one of sport\'s greatest competitive trilogies'] },
    { secret: 'Rafael Nadal', hint: 'The "King of Clay" who won the French Open a record 14 times', facts: ['Spanish tennis player (born 1986); won a record 22 Grand Slam singles titles across his career', 'Nicknamed "the King of Clay" for his dominance on clay courts; his 14 French Open titles are the most by any player at a single Grand Slam', 'Also won an Olympic gold medal in singles (Beijing 2008) and doubles (Rio 2016)', 'His left-handed topspin forehand — one of the most distinctive and devastating shots in tennis history — was his primary weapon', 'Retired from professional tennis in November 2024 after a career marked by extraordinary achievement and repeated comebacks from serious injuries'] },
    { secret: 'Steffi Graf', hint: 'The German tennis queen who achieved the Golden Slam in a single year', facts: ['German tennis player (born 1969); won 22 Grand Slam singles titles across her career', 'The only player in history — male or female — to win the Golden Slam: all four Grand Slams plus Olympic gold in a single calendar year (1988)', 'Held the world No. 1 ranking for 377 total weeks — a record for any tennis player until Djokovic', 'Retired in 1999 at just 30 years old; married fellow tennis legend Andre Agassi in 2001', 'Her speed, athleticism and powerful forehand set new standards for women\'s tennis; widely regarded as the greatest female player of the Open Era'] },
    { secret: 'Martina Navratilova', hint: 'The Czech-American tennis player who won Wimbledon nine times', facts: ['Czech-American tennis player (born 1956); won 18 Grand Slam singles titles and a record 31 Grand Slam doubles titles', 'Won Wimbledon a record nine times, including six consecutively from 1982 to 1987', 'Defected from communist Czechoslovakia in 1975 and was granted US citizenship; she became one of the most decorated athletes in women\'s sports history', 'Brought unprecedented athleticism, strength training and physical preparation to women\'s tennis, raising the standard of the entire game', 'Continued playing professional tennis until 2006 — one of the longest careers in the sport\'s history'] },
    { secret: 'Rod Laver', hint: 'The Australian tennis legend who won the Grand Slam twice', facts: ['Australian tennis player (born 1938); widely regarded as one of the greatest tennis players who ever lived', 'The only player in history — male or female — to win the Calendar Grand Slam (all four Grand Slams in one year) twice: in 1962 and 1969', 'Won 11 Grand Slam singles titles; missed five years of Grand Slams entirely due to being classified as a professional (1963–67) when amateurs only competed', 'The Rod Laver Arena in Melbourne — the main showcourt of the Australian Open — is named in his honour', 'At his peak in the 1960s, was universally considered the greatest player in the world; admired equally for his skill and his sportsmanship'] },
    { secret: 'Pete Sampras', hint: 'The American tennis champion who dominated the 1990s with his serve and volley', facts: ['American tennis player (born 1971); dominated men\'s tennis through the 1990s with a record 14 Grand Slam singles titles at the time of his retirement', 'Won Wimbledon seven times and the US Open five times; characterised by a devastatingly powerful serve, explosive athleticism and lethal net play', 'Held the year-end world No. 1 ranking for a record six consecutive years (1993–1998)', 'Won his 14th and final Grand Slam at the 2002 US Open — a surprise win after months of poor form — and quietly retired shortly after', 'His record of 14 Grand Slams stood until Roger Federer passed it in 2009'] },
    { secret: 'Michael Schumacher', hint: 'The German Formula 1 driver who won a record seven World Championships', facts: ['German racing driver (born 1969); won a record seven Formula 1 World Championships — a record later equalled but not yet beaten', 'Won two titles with Benetton (1994, 1995) and five consecutively with Ferrari (2000–2004)', 'Held the record for most Grand Prix victories (91) until Lewis Hamilton broke it in 2020', 'Known for his relentless work ethic, physical fitness and ability to extract the maximum from any car', 'Suffered devastating brain injuries in a skiing accident in Méribel, France, in December 2013; his condition has been kept private by his family ever since'] },
    { secret: 'Lewis Hamilton', hint: 'The British Formula 1 champion who equalled Schumacher\'s record of seven titles', facts: ['British Formula 1 driver (born 1985); won seven World Championships — equalling Michael Schumacher\'s all-time record', 'The first and only Black Formula 1 World Champion; a vocal advocate for diversity and anti-racism in motorsport', 'Broke Schumacher\'s records for most race wins (103+) and most pole positions (100+) during his career', 'Won his first title with McLaren in 2008 and six more with Mercedes (2014, 2015, 2017, 2018, 2019, 2020)', 'Moved to Ferrari for the 2025 season; widely regarded as one of the most complete racing drivers in the sport\'s history'] },
    { secret: 'Ayrton Senna', hint: 'The Brazilian racing genius who died on the track at Imola in 1994', facts: ['Brazilian Formula 1 driver (1960–1994); won three World Championships (1988, 1990, 1991) and is revered as perhaps the greatest driver who ever lived', 'Held the record of 65 pole positions for over a decade; famous for his supernatural ability in wet conditions', 'Had an intense, bitter and defining rivalry with Alain Prost — the two were involved in several famous championship-deciding collisions', 'A deeply spiritual man who spoke openly about transcendental experiences during his greatest qualifying laps', 'Died on 1 May 1994 when his Williams car crashed at the Tamburello corner at Imola; his death devastated the sport and led to sweeping safety reforms'] },
    { secret: 'Alain Prost', hint: 'The calculating French Formula 1 champion known as "The Professor"', facts: ['French Formula 1 driver (born 1955); won four World Championships (1985, 1986, 1989, 1993)', 'Known as "The Professor" for his analytical, precise driving style — conserving tyres and fuel to win races with calculated efficiency rather than raw speed', 'Had a fierce, defining and ultimately tragic rivalry with Ayrton Senna; the two were team-mates at McLaren in 1988–89', 'His 51 race victories at retirement were a record until broken by Michael Schumacher', 'Won his fourth title with Williams in 1993 after his most dominant season; retired at the end of the year, aged 38'] },
    { secret: 'Otto von Bismarck', hint: 'The "Iron Chancellor" who unified Germany and dominated European politics', facts: ['Prussian statesman (1815–1898); the architect of German unification and first Chancellor of the German Empire', 'Known as the "Iron Chancellor" for his ruthless, realpolitik approach to politics: "Blood and iron" was his doctrine for achieving national goals', 'Masterminded three wars (against Denmark 1864, Austria 1866, France 1870–71) that united the German states under Prussian leadership', 'Introduced Europe\'s first modern welfare state — old-age pensions, accident insurance, health insurance — as a political strategy to undercut socialist movements', 'Dominated European diplomacy for 20 years; his dismissal by Kaiser Wilhelm II in 1890 destabilised the careful balance of alliances he had built'] },
    { secret: 'Adolf Hitler', hint: 'The Nazi dictator who started World War II and orchestrated the Holocaust', facts: ['Austrian-born German politician (1889–1945); leader of the National Socialist (Nazi) Party; Chancellor of Germany from 1933', 'Rose to power exploiting the economic humiliation of the Great Depression and resentment over WWI\'s Treaty of Versailles', 'Triggered World War II by invading Poland on 1 September 1939; his forces eventually occupied most of continental Europe', 'Orchestrated the Holocaust — the systematic murder of six million Jews and millions of others including Roma, disabled people and Soviet POWs', 'Died by suicide in his Berlin bunker on 30 April 1945 as Soviet forces closed in; responsible for the deaths of an estimated 70–85 million people in WWII'] },
    { secret: 'Khalid ibn al-Walid', hint: 'The undefeated Muslim general called the "Sword of Allah"', facts: ['Arab military commander (c.585–642 AD); one of the greatest military commanders in history', 'Originally fought against the early Muslim community at the Battle of Uhud (625 AD); converted to Islam in 629 AD', 'Given the title "Saif Allah" (Sword of Allah) by Prophet Muhammad (PBUH) after his conversion', 'Never lost a battle in over 100 engagements across Arabia, Iraq, Persia and Syria — an unprecedented military record', 'Led the rapid Muslim conquests of much of the Middle East; his campaigns against the Byzantine and Sassanid empires transformed the political map of the ancient world'] },
    { secret: 'Robert Mugabe', hint: 'Zimbabwe\'s liberation hero who became a devastating autocrat', facts: ['Zimbabwean politician (1924–2019); Prime Minister (1980–1987) then President (1987–2017) of Zimbabwe', 'Led the independence movement against white minority rule in Rhodesia; celebrated internationally when he came to power in 1980', 'His seizure of white-owned farms from 2000 onwards destroyed Zimbabwe\'s agricultural economy, triggering famine and mass emigration', 'Zimbabwe\'s inflation reached 89.7 sextillion percent annually in 2008 — the second worst hyperinflation in recorded history', 'Ousted in a military coup in November 2017 after 37 years in power; died in Singapore in 2019 aged 95'] },
    { secret: 'Idi Amin', hint: 'Uganda\'s brutal military dictator who expelled Asians and terrorised his own people', facts: ['Ugandan military dictator (c.1925–2003); seized power in a coup in January 1971; ruled until 1979', 'Expelled approximately 80,000 Asians — mainly Ugandan Indians — in 1972 in 90 days, devastating Uganda\'s economy', 'His regime killed an estimated 100,000 to 500,000 Ugandans through political purges, ethnic violence and arbitrary executions', 'Awarded himself the title: "His Excellency, President for Life, Field Marshal Al Hadji Doctor Idi Amin Dada, VC, DSO, MC, Lord of All the Beasts of the Earth and Fishes of the Seas and Conqueror of the British Empire"', 'Overthrown in 1979 when Tanzanian forces invaded; fled to Libya then Saudi Arabia, where he lived in exile until his death in 2003'] },
    { secret: 'Mustafa Kemal Atatürk', hint: 'The founder of modern Turkey who abolished the caliphate and Westernised a nation', facts: ['Turkish military officer and statesman (1881–1938); founder and first President of the Republic of Turkey (1923–1938)', 'Led the Turkish War of Independence (1919–23) that expelled Greek, French and British occupation forces from Anatolia after WWI', 'Abolished the Ottoman Sultanate (1922) and the Islamic Caliphate (1924) — a seismic moment in Islamic world history', 'Implemented sweeping secular modernisation: replaced Arabic script with the Latin alphabet, adopted Western legal codes, introduced women\'s suffrage and banned traditional Islamic dress in public', 'His name "Atatürk" — meaning "Father of the Turks" — was given to him by the Turkish parliament in 1934; his legacy is protected by Turkish law'] },
    { secret: 'Babur (Zaheeruddin Muhammad)', hint: 'The Timurid prince who founded the Mughal Empire in India', facts: ['Born 1483 in Fergana (modern Uzbekistan); died 1530 in Agra; of Timurid (Tamerlane) and Chingizid (Genghis Khan) descent', 'Lost his Central Asian kingdom repeatedly as a young man before establishing control over Kabul in 1504 and turning his ambitions toward India', 'Defeated Sultan Ibrahim Lodi at the First Battle of Panipat on 21 April 1526, founding the Mughal Empire that would rule India for over three centuries', 'A gifted poet, diarist and naturalist; his autobiography the Baburnama is one of history\'s great personal memoirs — frank, detailed and literary', 'His empire was consolidated by his son Humayun and grandson Akbar into one of history\'s greatest dynasties'] },
    { secret: 'Emperor Akbar', hint: 'The greatest Mughal Emperor, famous for religious tolerance and a vast empire', facts: ['Third Mughal Emperor (1542–1605); ruled 1556–1605 — widely considered the greatest ruler of the Mughal dynasty', 'Expanded the Mughal Empire to cover most of the Indian subcontinent through military conquest and strategic diplomacy', 'Famous for his exceptional religious tolerance: married Hindu Rajput princesses, abolished the jizya tax on non-Muslims and patronised all religions equally', 'Illiterate but extraordinarily intelligent; had texts read aloud to him in multiple languages and maintained a vast library', 'Built Fatehpur Sikri — a magnificent planned capital — and reformed Mughal administration, currency, taxation and military organisation; his reign was considered a golden age'] },
    { secret: 'Shah Jahan', hint: 'The Mughal Emperor who built the Taj Mahal for his beloved wife', facts: ['Fifth Mughal Emperor (1592–1666); ruled 1628–1658 during the height of Mughal artistic and architectural achievement', 'Built the Taj Mahal (1632–1648) in Agra as a mausoleum for his beloved wife Mumtaz Mahal, who died giving birth to their 14th child', 'Also built the Red Fort and Jama Masjid in Delhi, the Wazir Khan Mosque in Lahore and the Peacock Throne — treasures of Islamic architecture', 'His reign is considered the golden age of Mughal architecture; he transformed the empire\'s building programme with white marble and precious stone inlay', 'Deposed and imprisoned by his own son Aurangzeb in 1658; spent his final years confined in the Agra Fort, gazing at the Taj Mahal across the river until his death'] },
    { secret: 'Aurangzeb', hint: 'The last great Mughal Emperor who expanded the empire to its greatest size', facts: ['Sixth Mughal Emperor (1618–1707); ruled 1658–1707 — the longest reign of any Mughal Emperor at 49 years', 'Seized the throne by imprisoning his father Shah Jahan and executing his brothers after a war of succession', 'Expanded the Mughal Empire to its greatest ever territorial extent, covering nearly the entire Indian subcontinent — over 4 million square kilometres', 'A strict and orthodox Sunni Muslim; reimposed the jizya tax on non-Muslims, reversed many of Akbar\'s tolerant policies and destroyed some Hindu temples', 'His costly 27-year military campaign in the Deccan drained the empire\'s resources; after his death in 1707 the Mughal Empire rapidly fragmented'] },
    { secret: 'Sheikh Mujibur Rahman', hint: 'The founding father of Bangladesh who led his people to independence', facts: ['Bengali politician (1920–1975); founding father and first Prime Minister (later President) of Bangladesh', 'Led the Awami League to a decisive victory in Pakistan\'s 1970 general elections — a result the military government refused to honour', 'Delivered his historic 7th March 1971 speech in Dhaka — "This struggle is for our liberation" — effectively launching the independence movement', 'Was arrested on 25 March 1971 when Pakistan\'s military launched its crackdown; spent the entire Liberation War in a Pakistani prison', 'Known as "Bangabandhu" (Friend of Bengal); was assassinated along with most of his family in a military coup on 15 August 1975'] },
    { secret: 'Faiz Ahmad Faiz', hint: 'Pakistan\'s greatest revolutionary Urdu poet whose words became anthems of protest', facts: ['Pakistani Urdu poet (1911–1984); one of the most celebrated poets in the Urdu language of the 20th century', 'His poetry blended the classical Urdu ghazal tradition with progressive socialist themes — expressing longing for justice in luminous verse', 'Arrested by the Pakistani government in 1951 for alleged conspiracy (the Rawalpindi Conspiracy Case) and imprisoned for four years; continued writing in prison', 'His poem "Hum Dekhenge" (We Shall See) became a rallying anthem of protest movements in Pakistan, India and beyond', 'Won the Lenin Peace Prize from the Soviet Union in 1962; was repeatedly nominated for the Nobel Prize in Literature; his collected works are revered across South Asia'] },
  ],
  event: [
    { secret: 'Moon Landing (Apollo 11)', hint: 'A historic 1969 space mission', facts: ['Apollo 11 launched on 16 July 1969, carrying Armstrong, Aldrin, and Collins', 'Neil Armstrong became the first human to walk on the Moon on 20 July 1969', 'His words: "That\'s one small step for man, one giant leap for mankind"', 'Buzz Aldrin joined him on the surface; Michael Collins orbited above alone', 'Fulfilled President Kennedy\'s 1961 pledge to land on the Moon before the decade\'s end'] },
    { secret: 'Fall of the Berlin Wall', hint: 'A pivotal 1989 event in European history', facts: ['The Berlin Wall divided East and West Germany from 1961 to 1989', 'Built to stop mass emigration from Communist East Germany to the West', 'On 9 November 1989 a misread announcement triggered crowds to rush the checkpoints', 'Guards stood down and Berliners began demolishing the wall with hammers', 'Led directly to German reunification in 1990 and the end of the Cold War'] },
    { secret: 'The French Revolution', hint: 'A late 18th century uprising that transformed a nation', facts: ['Began in 1789, driven by financial crisis, food shortages, and extreme inequality', 'Storming of the Bastille on 14 July 1789 is its symbolic start', 'King Louis XVI was executed by guillotine in January 1793', 'The Reign of Terror (1793–94) saw over 17,000 people officially executed', 'Ended with Napoleon\'s coup in 1799, replacing the republic with his rule'] },
    { secret: 'The Black Death', hint: 'A devastating 14th century pandemic', facts: ['A bubonic plague epidemic that swept Europe from 1347 to 1351', 'Killed an estimated 30–60% of Europe\'s population — roughly 25 million people', 'Spread by fleas on rats that arrived on merchant ships from Asia', 'Took Europe over 200 years to recover its pre-plague population', 'Indirectly ended feudalism by creating labour shortages that gave peasants bargaining power'] },
    { secret: 'Signing of the Magna Carta', hint: 'A 1215 document that changed the rule of law', facts: ['Signed on 15 June 1215 by King John of England at Runnymede', 'Rebellious barons forced the king to sign it to limit royal power', 'Established that even the king must obey the law — a revolutionary idea', 'Introduced the right to a fair trial that underpins modern legal systems', 'Only four original copies survive, all kept in England'] },
    { secret: 'World War II', hint: 'The largest and most destructive war in history', facts: ['Fought from 1939 to 1945, involving more than 30 countries', 'Started when Nazi Germany invaded Poland on 1 September 1939', 'Approximately 70–85 million people died — around 3% of the world\'s population', 'The Holocaust saw the systematic murder of 6 million Jewish people by the Nazi regime', 'Ended in Europe on 8 May 1945 (VE Day) and in the Pacific on 2 September 1945 (VJ Day)'] },
    { secret: 'Wedding of Princess Diana', hint: 'A 1981 royal wedding watched by 750 million people', facts: ['Prince Charles married Lady Diana Spencer on 29 July 1981 at St Paul\'s Cathedral, London', 'An estimated 750 million people worldwide watched on television', 'Diana\'s dress had a 7.6-metre train — one of the longest in royal history', '3,500 guests attended; the Archbishop of Canterbury officiated', 'Their marriage later became one of the most publicly analysed royal relationships, ending in divorce in 1996'] },
    { secret: '9/11 Attacks', hint: 'The deadliest terrorist attack in history', facts: ['On 11 September 2001, 19 al-Qaeda terrorists hijacked four commercial aircraft in the USA', 'Two planes were flown into the Twin Towers of the World Trade Centre in New York, causing both to collapse', 'A third plane struck the Pentagon; a fourth crashed in Pennsylvania after passenger resistance', 'Approximately 3,000 people were killed in the attacks', 'Led to the US-led "War on Terror," invasions of Afghanistan and Iraq, and massive changes to global security'] },
    { secret: '2004 Indian Ocean Tsunami', hint: 'A Boxing Day disaster that killed over 200,000 people', facts: ['Triggered by a magnitude 9.1 earthquake off Sumatra on 26 December 2004', 'Generated waves up to 30 metres high that struck coastlines across 14 countries', 'Approximately 227,000 people were killed — one of the deadliest natural disasters in recorded history', 'Indonesia, Sri Lanka, India and Thailand suffered the greatest losses', 'Prompted the creation of the Indian Ocean Tsunami Warning System'] },
    { secret: 'COVID-19 Pandemic', hint: 'A global pandemic that began in Wuhan in 2019', facts: ['Caused by the SARS-CoV-2 coronavirus, first identified in Wuhan, China in late 2019', 'Declared a global pandemic by the WHO on 11 March 2020', 'Caused the largest global economic shutdown since the Great Depression', 'Over 7 million deaths officially recorded; actual excess death estimates are far higher', 'Led to the fastest vaccine development in history — vaccines authorised within a year of outbreak'] },
    { secret: 'Establishment of the United Nations', hint: 'A global peacekeeping organisation founded after WWII', facts: ['The UN Charter was signed on 26 June 1945 in San Francisco by 51 founding nations', 'Replaced the failed League of Nations, which could not prevent World War II', 'Founded on four principles: peace, security, development, and human rights', 'Has 193 member states today — virtually every recognised nation on Earth', 'Headquartered in New York City; its main organs include the Security Council and General Assembly'] },
    { secret: 'American Revolution', hint: 'The war that created the United States', facts: ['Thirteen British colonies in North America declared independence from Britain in 1776', 'The Declaration of Independence, adopted on 4 July 1776, proclaimed "all men are created equal"', 'Fighting began at Lexington and Concord in April 1775; ended with the Treaty of Paris in 1783', 'George Washington commanded the Continental Army; French military support proved decisive', 'Created the world\'s first modern constitutional democratic republic, inspiring revolutions worldwide'] },
    { secret: 'Russian Revolution (1917)', hint: 'The revolution that created the world\'s first communist state', facts: ['Two revolutions in 1917 overthrew the Tsar and established the world\'s first communist state', 'The February Revolution ended the 300-year Romanov dynasty; Tsar Nicholas II abdicated', 'The October Revolution was led by Lenin\'s Bolsheviks, who seized power from the Provisional Government', 'Triggered a bloody civil war (1917–22) between Red Bolsheviks and White anti-communist forces', 'Resulted in the creation of the Soviet Union in 1922, which would last until 1991'] },
    { secret: 'Break-up of the Soviet Union', hint: 'The 1991 collapse that ended the Cold War', facts: ['The USSR formally dissolved on 25 December 1991 when President Mikhail Gorbachev resigned', 'At its peak the Soviet Union comprised 15 republics spanning 11 time zones', 'Gorbachev\'s reforms — glasnost (openness) and perestroika (restructuring) — unintentionally accelerated the collapse', 'The fall of the Berlin Wall in 1989 triggered independence movements across Eastern Europe and Soviet republics', 'Its dissolution ended the Cold War and created 15 new independent states from former Soviet territory'] },
    { secret: 'Iranian Revolution (1979)', hint: 'The revolution that turned Iran into an Islamic Republic', facts: ['Overthrew Shah Mohammad Reza Pahlavi and established an Islamic Republic in Iran', 'Led by Ayatollah Ruhollah Khomeini, who returned from exile in France in February 1979', 'Millions of Iranians took to the streets; the Shah fled on 16 January 1979 and never returned', 'A new theocratic constitution gave the Supreme Leader ultimate authority over the state', 'The subsequent Iran hostage crisis — 52 Americans held for 444 days — permanently transformed US-Iran relations'] },
    { secret: 'Unification of Germany (1990)', hint: 'The reuniting of East and West Germany after the Cold War', facts: ['East and West Germany reunified on 3 October 1990 — less than a year after the fall of the Berlin Wall', 'Germany had been divided since 1945 into democratic West (FRG) and communist East (GDR)', 'Achieved through the "Two Plus Four Treaty" signed by both Germanys and the four WWII Allied powers', 'Helmut Kohl, West German Chancellor, was the chief political architect of reunification', 'Economic integration cost hundreds of billions as West Germany rebuilt the Eastern economy'] },
    { secret: 'First FIFA World Cup (1930)', hint: 'The inaugural football World Cup held in South America', facts: ['The inaugural FIFA World Cup was held in Uruguay in July 1930', 'Uruguay was chosen as host as they were reigning Olympic football champions', 'Only 13 nations participated — European teams largely boycotted due to the long sea journey', 'Uruguay defeated Argentina 4–2 in the final in Montevideo on 30 July 1930', 'Jules Rimet, FIFA president, was the driving force; the original trophy was named after him'] },
    { secret: 'First Cricket World Cup (1975)', hint: 'West Indies won the inaugural 60-overs cricket tournament', facts: ['The inaugural Cricket World Cup was held in England in June 1975 — 60 overs per side', 'Eight teams participated; officially called the Prudential Cup after its sponsor', 'West Indies, captained by Clive Lloyd, defeated Australia by 17 runs in the Lord\'s final', 'Clive Lloyd scored a powerful 102 in the final; Viv Richards ran out three Australian batsmen', 'The tournament proved one-day cricket could be a spectacular global event'] },
    { secret: 'Pakistan 1992 Cricket World Cup Win', hint: 'Imran Khan\'s "cornered tigers" claimed the trophy in Melbourne', facts: ['Pakistan won their first Cricket World Cup on 25 March 1992 in Melbourne, Australia', 'Pakistan had started poorly and nearly missed the semi-finals before a miraculous turnaround', 'In the final, Pakistan defeated England by 22 runs, scoring 249 for 6 from 50 overs', 'Wasim Akram\'s devastating spell (3/49) and Imran Khan\'s leadership were crucial', 'Imran dedicated the victory to the Shaukat Khanum Cancer Hospital he was building in memory of his mother'] },
    { secret: 'India 1983 Cricket World Cup Win', hint: 'Kapil Dev\'s underdogs stunned the mighty West Indies at Lord\'s', facts: ['India won their first Cricket World Cup on 25 June 1983 at Lord\'s Cricket Ground, London', 'Captained by Kapil Dev, India were massive underdogs; West Indies were two-time defending champions', 'India scored just 183 in the final but bowled West Indies out for 140', 'Kapil Dev\'s earlier unbeaten 175 against Zimbabwe when India were 17/5 is one of cricket\'s greatest innings', 'The victory transformed Indian cricket and sparked an explosion of interest that made India the sport\'s financial power'] },
    { secret: 'Sri Lanka 1996 Cricket World Cup Win', hint: 'Sri Lanka revolutionised batting and claimed the title in Lahore', facts: ['Sri Lanka won their first Cricket World Cup on 17 March 1996 in Lahore, Pakistan', 'Their aggressive opening partnership of Jayasuriya and Kaluwitharana revolutionised ODI batting', 'Sri Lanka defeated Australia by 7 wickets in the final; India and West Indies had forfeited matches against them', 'Aravinda de Silva scored 107 not out in the final — one of the great World Cup performances', 'Jayasuriya\'s explosive attacking method permanently changed how teams approach the powerplay overs'] },
    { secret: 'Partition of India (1947)', hint: 'The division that created India and Pakistan', facts: ['British India was divided into two independent nations — India and Pakistan — on 14–15 August 1947', 'Jinnah became Governor-General of Pakistan; Nehru became Prime Minister of India', 'Approximately 14 million people crossed borders in one of history\'s largest mass migrations', 'Sectarian violence between Hindus, Muslims and Sikhs killed an estimated 200,000 to 2 million people', 'New borders divided Punjab and Bengal overnight, splitting communities, families and cultures'] },
    { secret: 'Attack on Pearl Harbour', hint: 'The surprise attack that brought the USA into WWII', facts: ['Imperial Japan launched a surprise strike on the US naval base at Pearl Harbour, Hawaii on 7 December 1941', '353 Japanese aircraft attacked in two waves, sinking or damaging 19 US Navy ships', '2,403 Americans were killed and 1,178 wounded in the attack', 'President Roosevelt called it "a date which will live in infamy"; the US declared war on Japan the next day', 'The attack brought the United States fully into World War II on the Allied side'] },
    { secret: 'Hiroshima & Nagasaki Atomic Bombings', hint: 'The only use of nuclear weapons in warfare', facts: ['The USA dropped atomic bombs on Hiroshima on 6 August and Nagasaki on 9 August 1945', 'Hiroshima\'s bomb immediately killed approximately 70,000–80,000 people; Nagasaki\'s killed 40,000+', 'Total deaths including radiation sickness reached an estimated 129,000–226,000 people', 'Japan announced surrender on 15 August 1945; formal surrender was signed on 2 September 1945', 'The bombings remain the only use of nuclear weapons in armed conflict in human history'] },
    { secret: 'Sinking of the Titanic', hint: 'The "unsinkable" ship that sank on its maiden voyage in 1912', facts: ['RMS Titanic struck an iceberg at 11:40 PM on 14 April 1912 and sank in 2 hours 40 minutes', 'She was on her maiden voyage from Southampton to New York City', 'Of the 2,224 people aboard, approximately 1,500 died — one of the deadliest peacetime maritime disasters', 'The ship did not carry enough lifeboats for all passengers, despite being considered virtually unsinkable', 'The wreck was discovered 3,800 metres below the North Atlantic in 1985 by oceanographer Robert Ballard'] },
    { secret: 'Chernobyl Disaster', hint: 'The 1986 Soviet nuclear accident that contaminated Europe', facts: ['On 26 April 1986, reactor No. 4 at the Chernobyl Nuclear Power Plant in Ukraine exploded', 'The explosion during a safety test sent radioactive fallout across much of Europe', 'Two workers died in the explosion; 28 more died within months from acute radiation syndrome', '116,000 people were evacuated from the surrounding Exclusion Zone; Pripyat was abandoned overnight', 'The disaster accelerated glasnost and is credited with helping bring about the Soviet Union\'s collapse'] },
    { secret: 'Arab Spring', hint: 'A wave of pro-democracy uprisings across the Arab world from 2010', facts: ['A wave of protests and uprisings that swept the Arab world beginning in December 2010', 'Sparked in Tunisia when Mohamed Bouazizi set himself on fire to protest police harassment', 'Led to the overthrow of long-standing leaders in Tunisia, Egypt, Libya and Yemen', 'Syria descended into a devastating civil war that displaced millions and drew in global powers', 'Raised hopes for democracy across the region but outcomes were mixed and often tragic'] },
    { secret: 'Formation of the European Union', hint: 'The political and economic union of European nations', facts: ['Grew from post-WWII efforts to bind European nations together economically to prevent future wars', 'The Treaty of Rome (1957) created the European Economic Community among 6 founding nations', 'The Maastricht Treaty (1992) officially created the European Union and set the path for a common currency', 'The Euro (€) was introduced in 1999 and now circulates in 20 EU member states', 'The UK voted to leave the EU in the 2016 Brexit referendum and formally departed in 2020'] },
    { secret: 'Release of Nelson Mandela', hint: 'A 1990 release that paved the way to end apartheid', facts: ['Nelson Mandela walked free from Victor Verster Prison on 11 February 1990 after 27 years of imprisonment', 'Convicted of sabotage and conspiracy to overthrow the apartheid government in 1964', 'His release was ordered by President F.W. de Klerk as part of negotiations to end apartheid', 'Mandela led the ANC to victory in South Africa\'s first multiracial elections in 1994', 'Became South Africa\'s first Black president (1994–1999), choosing reconciliation over retribution'] },
    { secret: 'World War I', hint: 'The "Great War" of 1914–1918 that reshaped the world', facts: ['Began on 28 July 1914 following the assassination of Archduke Franz Ferdinand of Austria in Sarajevo', 'Fought mainly in Europe between the Allied Powers (UK, France, Russia, USA) and the Central Powers (Germany, Austria-Hungary, Ottoman Empire)', 'Introduced industrial-scale warfare: trenches, poison gas, tanks, aircraft and machine guns on a massive scale', 'Approximately 20 million people died — both military and civilian — making it one of the deadliest conflicts in history', 'Ended with the Treaty of Versailles on 28 June 1919; its harsh terms on Germany were widely blamed for planting the seeds of World War II'] },
    { secret: 'The Holocaust', hint: 'The Nazi genocide of six million Jewish people during World War II', facts: ['The systematic, state-sponsored murder of six million Jewish people by Nazi Germany and its collaborators during WWII', 'Nazi racial ideology classified Jews as an inferior race to be eliminated; the persecution began with 1933 discriminatory laws', 'Mass murder began in 1941 with mobile killing squads (Einsatzgruppen); death camps including Auschwitz industrialised the killing', 'Two-thirds of Europe\'s pre-war Jewish population were killed; in Poland, over 90% of Jews were murdered', 'The Holocaust led directly to the creation of Israel in 1948 and the Genocide Convention (1948) in international law'] },
    { secret: 'Assassination of JFK', hint: 'The 1963 murder of a US president that shocked the world', facts: ['President John F. Kennedy was shot while riding in a motorcade through Dealey Plaza in Dallas, Texas, on 22 November 1963', 'Texas Governor John Connally, sitting in front of Kennedy, was also wounded in the attack', 'Lee Harvey Oswald was arrested as the lone gunman but was shot dead two days later by Jack Ruby before a trial could begin', 'The Warren Commission (1964) concluded Oswald acted alone; many Americans have never accepted this explanation', 'The assassination was broadcast live on television and remains one of the defining moments of 20th-century American life'] },
    { secret: 'Cuban Missile Crisis', hint: 'The 1962 nuclear standoff that brought the world to the brink of war', facts: ['A 13-day confrontation (16–28 October 1962) between the USA and USSR — the closest the Cold War came to nuclear war', 'Began when US spy planes discovered Soviet nuclear missile installations being built in Cuba', 'President Kennedy ordered a naval "quarantine" (blockade) of Cuba; Soviet ships approached with more weapons', 'Soviet leader Khrushchev agreed to remove the missiles; Kennedy secretly agreed to remove US missiles from Turkey', 'Established the Washington–Moscow hotline ("red phone") to enable direct communication between the two superpowers in future crises'] },
    { secret: 'Vietnam War', hint: 'The Cold War conflict that divided America and ended in US withdrawal', facts: ['A prolonged military conflict in Southeast Asia (1955–1975) between communist North Vietnam and US-backed South Vietnam', 'The USA became directly involved in 1965, eventually deploying over 500,000 troops at the conflict\'s peak', 'The Tet Offensive (January 1968) — a coordinated North Vietnamese attack — shattered American public confidence in the war', 'Over 58,000 US service members died; Vietnamese casualties (North and South, military and civilian) exceeded 2 million', 'US troops withdrew in 1973; Saigon fell on 30 April 1975, reunifying Vietnam under communist rule'] },
    { secret: 'D-Day (Normandy Landings)', hint: 'The largest seaborne invasion in history, on 6 June 1944', facts: ['On 6 June 1944, Allied forces launched Operation Overlord — the largest seaborne invasion in history', 'Over 156,000 troops from the USA, UK, Canada and other Allied nations crossed the English Channel to storm five beaches in Normandy, France', 'Allied casualties on the first day reached approximately 10,000; German casualties were between 4,000 and 9,000', 'General Eisenhower commanded the Allied forces; an elaborate deception (Operation Fortitude) fooled Germany about the landing location', 'The successful landings opened a Western Front that, combined with Soviet pressure from the East, brought about Nazi Germany\'s defeat within a year'] },
    { secret: 'Battle of Waterloo', hint: 'Napoleon\'s final defeat, on 18 June 1815', facts: ['Fought on 18 June 1815 near Waterloo in modern Belgium; Napoleon\'s final military defeat', 'Napoleon\'s French army faced a British-led coalition under the Duke of Wellington and a Prussian army under Blücher', 'Napoleon miscalculated the timing of Prussian reinforcements, which arrived late in the day and turned the battle decisively', 'Approximately 25,000 French soldiers were killed or wounded; total Allied casualties were around 22,000', 'Napoleon surrendered to the British, was exiled to Saint Helena in the South Atlantic, and never returned; he died there in 1821'] },
    { secret: 'The Great Depression', hint: 'The worst economic crisis of the 20th century, triggered by the 1929 Wall Street Crash', facts: ['The worst economic downturn of the 20th century, beginning with the Wall Street Crash on 24 October 1929 ("Black Thursday")', 'US unemployment reached 25% by 1933; industrial production collapsed and thousands of banks failed', 'The Depression spread worldwide, devastating economies in Europe, Latin America, Australia and beyond', 'US President Roosevelt\'s "New Deal" — a sweeping programme of public works and reform — was the main political response', 'The Depression helped fuel the rise of fascism in Germany and Italy, contributing to the conditions that led to World War II'] },
    { secret: 'The Space Race', hint: 'The Cold War rivalry between the USA and USSR to conquer outer space', facts: ['A competition between the USA and Soviet Union (1957–1969) to achieve supremacy in space exploration', 'Began on 4 October 1957 when the USSR launched Sputnik 1 — the first artificial satellite to orbit Earth', 'The USSR won the first laps: first satellite, first animal in space (Laika, 1957), first human (Gagarin, 1961)', 'President Kennedy pledged in 1961 to land a man on the Moon before the end of the decade — a seemingly impossible goal', 'The USA won the decisive race: Apollo 11 landed on the Moon on 20 July 1969, with Neil Armstrong first to walk on the lunar surface'] },
    { secret: 'The Industrial Revolution', hint: 'The transformation from farming to factories that changed the world from the 1760s', facts: ['A period of rapid industrialisation that began in Britain around the 1760s and spread worldwide over the next century', 'The steam engine, iron production, mechanised textile manufacture and canals transformed how goods were made and moved', 'Triggered mass migration from countryside to cities; by 1851 more than half of Britain\'s population lived in urban areas — a world first', 'Created the modern working class and gave rise to capitalism, trade unionism and socialism as competing responses', 'Transformed the global economy: by 1900 Britain and the USA were the world\'s industrial superpowers and standard of living had risen dramatically'] },
    { secret: 'Assassination of Archduke Franz Ferdinand', hint: 'The 1914 assassination that triggered World War I', facts: ['Archduke Franz Ferdinand, heir to the Austro-Hungarian throne, was shot dead in Sarajevo on 28 June 1914', 'Killed by Gavrilo Princip, a 19-year-old Bosnian Serb nationalist linked to the Black Hand secret society', 'The assassination set off a chain of diplomatic ultimatums and mobilisations that pulled all Europe\'s great powers into war within six weeks', 'Austria-Hungary blamed Serbia, issued an ultimatum, declared war; Germany backed Austria-Hungary; Russia mobilised to support Serbia; the system of alliances ignited', 'The spark that set off WWI — an event that reshaped the map of Europe, ended four empires and killed 20 million people'] },
    { secret: 'The Korean War', hint: 'The "Forgotten War" between North and South Korea from 1950 to 1953', facts: ['Began on 25 June 1950 when North Korea — backed by the Soviet Union and China — invaded South Korea', 'A US-led United Nations coalition intervened to defend South Korea; China entered the war when UN forces approached the Chinese border', 'The front line swayed dramatically before stabilising near the 38th Parallel — close to where it had started', 'An armistice was signed on 27 July 1953; no formal peace treaty has ever been concluded — the Korean War is technically still not over', 'Approximately 5 million people died in total, military and civilian; the war entrenched the division between North and South Korea that persists today'] },
    { secret: 'The Cold War', hint: 'The ideological global standoff between the USA and USSR from 1947 to 1991', facts: ['A state of geopolitical tension between the United States and Soviet Union after WWII, lasting from roughly 1947 to 1991', 'Neither superpower directly fought the other — instead they competed through proxy wars, arms races, espionage and ideological influence', 'Defined by the nuclear arms race — both sides built thousands of warheads capable of ending human civilisation', 'Flashpoints included the Berlin Blockade (1948), Korean War (1950–53), Cuban Missile Crisis (1962) and Vietnam War (1955–75)', 'Ended when the Soviet Union dissolved on 25 December 1991 after a decade of economic stagnation and Gorbachev\'s liberalising reforms'] },
    { secret: 'Rwandan Genocide', hint: 'The 1994 massacre in which 800,000 Tutsi people were killed in 100 days', facts: ['A genocide in Rwanda in which an estimated 500,000 to 800,000 Tutsi people were systematically murdered in just 100 days in 1994', 'Triggered on 6 April 1994 when President Habyarimana\'s plane was shot down — Hutu extremists used this as the signal to begin mass killings', 'Ordinary Hutus were incited via radio broadcasts to murder their Tutsi neighbours with machetes and clubs', 'The United Nations and international community stood by as the genocide unfolded — a failure later called a defining shame of the decade', 'Approximately 2 million Rwandans fled to neighbouring countries; Rwanda has since rebuilt remarkably into one of Africa\'s most stable states'] },
    { secret: 'Fall of Constantinople', hint: 'The 1453 Ottoman conquest that ended the Roman Empire', facts: ['On 29 May 1453, Ottoman Sultan Mehmed II captured Constantinople — the capital of the Byzantine (Eastern Roman) Empire', 'The city had been the Roman Empire\'s capital for over 1,000 years, founded by Constantine the Great in 330 AD', 'Mehmed deployed massive cannons — including the Basilica cannon — to breach the ancient walls that had repelled attackers for centuries', 'The last Byzantine Emperor, Constantine XI, died fighting in the final battle; his body was never found', 'The fall ended the Byzantine Empire and shifted the overland Silk Road trade route, helping prompt European nations to seek sea routes to Asia — a factor in Columbus\'s 1492 voyage'] },
    { secret: 'Creation of Bangladesh', hint: 'The 1971 war of independence that created a new South Asian nation', facts: ['A war of independence fought in 1971 between East Pakistan and the Pakistani military backed by West Pakistan', 'Began when the military government of Pakistan refused to accept the overwhelming electoral victory of East Pakistan\'s Awami League', 'The Pakistani Army launched Operation Searchlight on 25 March 1971, killing thousands in Dhaka in a single night', 'India intervened militarily in December 1971 on the side of East Pakistan; the Pakistani military surrendered on 16 December 1971', 'Bangladesh emerged as the world\'s newest nation; an estimated 300,000 to 3 million people had died and up to 10 million fled as refugees'] },
    { secret: 'Opening of the Suez Canal', hint: 'The 1869 waterway that connected the Mediterranean to the Red Sea', facts: ['The Suez Canal opened on 17 November 1869 after 10 years of construction, connecting the Mediterranean Sea to the Red Sea', 'Built by the Suez Canal Company under Ferdinand de Lesseps; approximately 1.5 million workers were employed during construction', 'Cut the sea voyage from Europe to Asia by up to 7,000 km — eliminating the need to sail around Africa', 'Egypt\'s President Nasser nationalised the canal in 1956, triggering the Suez Crisis in which Britain, France and Israel invaded before US pressure forced their withdrawal', 'Today over 20,000 ships per year pass through the canal, representing about 12% of global trade'] },
    { secret: 'The Great Fire of London', hint: 'The 1666 fire that destroyed medieval London and led to Christopher Wren\'s rebuilding', facts: ['A devastating fire that swept through the City of London from 2–6 September 1666', 'Began in a bakery on Pudding Lane and rapidly spread through the closely packed timber buildings of the medieval city', 'Destroyed approximately 13,200 houses, 87 churches (including the old St Paul\'s Cathedral) and most of the buildings of the City', 'Killed remarkably few people officially — perhaps 6 — though the true toll from destruction of homes and livelihoods was far greater', 'Led to the rebuilding of London in brick and stone, with Christopher Wren designing the new St Paul\'s Cathedral and 51 new churches'] },
    { secret: 'Brexit', hint: 'The UK\'s historic vote to leave the European Union', facts: ['On 23 June 2016, the United Kingdom voted 52% to 48% to leave the European Union — the Brexit referendum', 'Prime Minister David Cameron called the referendum expecting Remain to win; he resigned the morning after the Leave result', 'Leave campaigners emphasised sovereignty, immigration control and the slogan "Take Back Control"; Remain warned of economic damage', 'Negotiations on the terms of departure dominated British politics for over three years; three Prime Ministers resigned over Brexit', 'The UK formally left the EU on 31 January 2020; transition ended 31 December 2020 — it was the first time a country had left the EU'] },
    { secret: 'The American Civil War', hint: 'The 1861–1865 war between the Union and the Confederacy over slavery', facts: ['A war fought between the northern United States (the Union) and 11 southern states that seceded to form the Confederacy (1861–1865)', 'The primary cause was slavery — southern states feared Abraham Lincoln\'s election meant slavery would be abolished', 'Approximately 620,000 soldiers died — more Americans than in any other war in the nation\'s history', 'Lincoln issued the Emancipation Proclamation in 1863, declaring enslaved people in rebel states free', 'The Union\'s victory in April 1865 preserved the United States and led to the 13th Amendment abolishing slavery throughout the country'] },
    { secret: 'India-Pakistan War (1965)', hint: 'The second war between India and Pakistan over Kashmir', facts: ['A war fought between India and Pakistan from August to September 1965, primarily over the disputed region of Kashmir', 'Pakistan launched Operation Gibraltar, infiltrating fighters into Indian-controlled Kashmir to incite an uprising — it failed to spark the expected revolt', 'India opened a second front near Lahore, threatening Pakistan\'s largest city and forcing Pakistan to divert forces from Kashmir', 'Involved one of the largest tank battles since WWII — particularly in the Sialkot and Lahore sectors', 'A ceasefire was declared on 22 September 1965 under United Nations pressure; the Tashkent Declaration (January 1966) formally ended hostilities with neither side gaining significant territory'] },
    { secret: '2008 Global Financial Crisis', hint: 'The worst economic collapse since the Great Depression, triggered by a US housing crash', facts: ['The worst global financial crisis since the Great Depression of the 1930s, beginning in 2007–2008', 'Triggered by the collapse of the US subprime mortgage market and the complex financial instruments (mortgage-backed securities) built upon it', 'The investment bank Lehman Brothers collapsed on 15 September 2008 — the largest bankruptcy in US history — triggering a global credit freeze', 'Governments worldwide spent trillions bailing out banks; unemployment surged and millions lost homes, savings and jobs', 'Led to the longest economic slump in a generation and a wave of political anger that fuelled populist movements worldwide in the years that followed'] },
    { secret: 'Birth of Jesus Christ', hint: 'The nativity event celebrated by over two billion Christians every Christmas', facts: ['According to the Gospels of Matthew and Luke, Jesus was born in Bethlehem in Judea during the reign of King Herod the Great', 'His mother was the Virgin Mary; Christians and Muslims alike believe he was conceived miraculously without a human father', 'The date is celebrated as Christmas on 25 December by most Christians, though the actual birth year is estimated by scholars at between 6 and 4 BC', 'The Magi (Wise Men) followed a star to Bethlehem and presented gifts of gold, frankincense and myrrh; angels announced the birth to shepherds in nearby fields', 'His birth is so significant to world history that the entire Western calendar — BC (Before Christ) and AD (Anno Domini) — is counted from it; over 2.4 billion Christians celebrate it annually'] },
    { secret: 'First Powered Flight', hint: 'The 1903 moment the Wright Brothers proved humans could fly', facts: ['On 17 December 1903, Orville and Wilbur Wright achieved the first sustained, controlled, powered heavier-than-air flight at Kitty Hawk, North Carolina', 'The first flight lasted just 12 seconds and covered 36 metres — barely longer than the wingspan of a modern Boeing 737', 'The brothers made four flights that day; the longest covered 260 metres in 59 seconds', 'Their aircraft, the Flyer, was made of spruce wood, muslin fabric and a small petrol engine they built themselves in their bicycle shop', 'Within 10 years aircraft were being used in warfare; within 24 years Charles Lindbergh crossed the Atlantic solo; today 100,000 commercial flights take off daily worldwide'] },
    { secret: 'First Human in Space', hint: 'The 1961 Soviet mission that sent the first person beyond Earth\'s atmosphere', facts: ['On 12 April 1961, Soviet cosmonaut Yuri Gagarin became the first human being to travel to outer space', 'His spacecraft Vostok 1 completed one full orbit of the Earth in 108 minutes, reaching a maximum altitude of 327 km', 'Gagarin reportedly said "Poyekhali!" (Let\'s go!) as his rocket launched — one of history\'s most celebrated exclamations', 'The mission was kept almost entirely secret until Gagarin was already in orbit; the world was stunned by the announcement', 'His flight shocked the United States and directly prompted President Kennedy to pledge that America would land a man on the Moon before the end of the decade'] },
    { secret: 'Cloning of Dolly the Sheep', hint: 'The 1996 scientific breakthrough that created the first cloned mammal from an adult cell', facts: ['On 5 July 1996, Dolly the sheep was born at the Roslin Institute in Edinburgh, Scotland — the first mammal cloned from an adult somatic (body) cell', 'Created by scientists Ian Wilmut and Keith Campbell using a technique called somatic cell nuclear transfer (SCNT)', 'Dolly\'s existence was kept secret for seven months; when announced in February 1997 it caused a global sensation and intense ethical debate', 'Her birth proved that the DNA in a fully differentiated adult cell still contains all the information needed to create an entire organism', 'Dolly lived for six years (half the normal lifespan for a sheep), developing arthritis and a lung disease; she was euthanised in February 2003 and her preserved body is displayed in a Scottish museum'] },
    { secret: 'Assassination of Mahatma Gandhi', hint: 'The 1948 murder of India\'s father of the nation', facts: ['Mahatma Gandhi was shot dead at point-blank range on 30 January 1948 at Birla House in New Delhi during an evening prayer meeting', 'His assassin was Nathuram Godse, a Hindu nationalist who blamed Gandhi for being too accommodating toward Muslims during Partition', 'Gandhi had just completed a fast to end Hindu-Muslim communal violence in Delhi; he was 78 years old at the time of his death', 'His last words, according to witnesses, were "Hey Ram" (Oh God) as he fell to the ground', 'The assassination shocked the world; Jawaharlal Nehru announced to the nation: "The light has gone out of our lives and there is darkness everywhere"'] },
    { secret: 'Assassination of Abraham Lincoln', hint: 'The 1865 murder of the president who ended American slavery', facts: ['President Abraham Lincoln was shot in the back of the head while watching a play at Ford\'s Theatre in Washington D.C. on the evening of 14 April 1865', 'His assassin was John Wilkes Booth, a well-known actor and Confederate sympathiser who leapt to the stage after firing, shouting "Sic semper tyrannis!" (Ever thus to tyrants)', 'Lincoln died the following morning on 15 April 1865 — just five days after the Confederate General Lee had surrendered, effectively ending the Civil War', 'Booth had planned simultaneous assassinations of Vice President Johnson and Secretary of State Seward on the same night; all other attempts failed', 'Booth was hunted down and killed 12 days later; eight co-conspirators were tried; four were hanged'] },
    { secret: 'Assassination of Benazir Bhutto', hint: 'The 2007 murder of Pakistan\'s former Prime Minister at a political rally', facts: ['Benazir Bhutto was assassinated on 27 December 2007 at Liaquat National Bagh in Rawalpindi, Pakistan, following a political rally', 'She had returned from eight years of self-imposed exile in October 2007 to contest elections; a suicide bomb attack on her homecoming procession in Karachi killed 139 people', 'Shot in the neck and head as she stood through the sunroof of her vehicle waving to supporters; a suicide bomber simultaneously detonated an explosive', 'She was 54 years old and had served twice as Prime Minister of Pakistan (1988–90 and 1993–96)', 'The UN investigation concluded that her death was preventable and that Pakistani authorities failed to provide adequate security; no one has ever been conclusively convicted of ordering her murder'] },
    { secret: '1998 Nuclear Tests (India & Pakistan)', hint: 'The back-to-back nuclear tests that made South Asia a nuclear flashpoint', facts: ['In May 1998, India conducted five nuclear tests (Operation Shakti) at Pokhran, Rajasthan on 11–13 May, declaring itself a nuclear weapons state', 'Pakistan responded with six nuclear tests (Operation Chagai) in the Chagai and Kharan districts of Balochistan on 28–30 May 1998 — becoming the first Muslim-majority nation to test nuclear weapons', 'The tit-for-tat tests triggered international condemnation and economic sanctions from the United States, Japan and other nations against both countries', 'Pakistan\'s Prime Minister Nawaz Sharif announced the tests saying "Today, we have settled the score" — a direct reference to India\'s tests two weeks earlier', 'The tests dramatically heightened tensions in South Asia; both nations now openly possessed nuclear weapons, transforming the geopolitical balance of the entire region'] },
    { secret: 'First Space Shuttle Flight', hint: 'The 1981 maiden voyage of NASA\'s reusable spacecraft', facts: ['Space Shuttle Columbia launched on 12 April 1981 — exactly 20 years after Yuri Gagarin\'s first spaceflight — on mission STS-1', 'Crewed by Commander John Young (a veteran of four previous spaceflights) and Pilot Robert Crippen on his first spaceflight', 'The first crewed spacecraft to be launched without an unmanned test flight first — an extraordinary gamble with human lives', 'Columbia orbited Earth 37 times over 54 hours before landing at Edwards Air Force Base in California on 14 April 1981', 'The Space Shuttle programme ultimately flew 135 missions over 30 years (1981–2011), launching satellites, building the ISS and carrying 355 different people to space'] },
    { secret: 'Space Shuttle Challenger Disaster', hint: 'The 1986 explosion that killed seven astronauts 73 seconds after launch', facts: ['Space Shuttle Challenger broke apart 73 seconds after launch on 28 January 1986, killing all seven crew members aboard', 'The crew included Christa McAuliffe, a high school teacher from New Hampshire who had been selected to be the first civilian in space — millions of schoolchildren watched the launch live', 'Caused by the failure of an O-ring seal in the right solid rocket booster, which allowed hot gases to breach the fuel tank; engineers had warned NASA the O-rings were unsafe in cold weather', 'Launch morning temperatures were unusually cold at 2°C — well below safe operating limits for the seals; NASA managers overrode the engineers\' objections', 'The disaster grounded the shuttle programme for 32 months; the Rogers Commission inquiry exposed serious safety management failures at NASA that had allowed known risks to be ignored'] },
    { secret: 'The Renaissance', hint: 'The great European cultural rebirth that followed the Middle Ages', facts: ['A cultural and intellectual movement that began in Florence, Italy in the 14th century and spread across Europe over the next 200 years', 'The word "Renaissance" means "rebirth" in French — referring to a revival of classical Greek and Roman art, literature, science and philosophy', 'Produced some of history\'s greatest artists: Leonardo da Vinci, Michelangelo, Raphael and Botticelli transformed painting and sculpture', 'The invention of the printing press by Gutenberg around 1440 accelerated the Renaissance by making books widely affordable for the first time', 'Led directly to the Scientific Revolution and the Age of Exploration; figures such as Copernicus, Galileo and Columbus were products of Renaissance thinking'] },
    { secret: 'Storming of the Bastille', hint: 'The 1789 attack on a Paris prison that ignited the French Revolution', facts: ['On 14 July 1789, a Paris mob stormed the Bastille fortress-prison, a symbol of royal tyranny, launching the French Revolution', 'The crowd was searching for gunpowder and weapons; only seven prisoners were found inside, but the symbolic impact was enormous', 'The fortress governor, the Marquis de Launay, was seized and beheaded; his head was paraded through Paris on a pike', 'King Louis XVI reportedly wrote in his diary that day: "Nothing" — not realising the revolution had begun', '14 July is now France\'s national holiday — Bastille Day — celebrated with military parades and fireworks across the country'] },
    { secret: 'Killing of Osama bin Laden', hint: 'The 2011 US Navy SEAL raid that eliminated the world\'s most wanted man', facts: ['Al-Qaeda leader Osama bin Laden was killed on 2 May 2011 in a covert raid by US Navy SEALs on a compound in Abbottabad, Pakistan', 'Operation Neptune Spear was authorised by President Barack Obama after years of intelligence work traced bin Laden to the compound', 'The raid lasted approximately 40 minutes; bin Laden was shot twice and killed; no US personnel were lost', 'President Obama announced the death to the nation late on 1 May 2011; crowds gathered outside the White House chanting "USA! USA!"', 'Bin Laden\'s body was buried at sea within 24 hours to prevent his grave becoming a shrine; his death came nearly a decade after the 9/11 attacks he had masterminded'] },
    { secret: 'Signing of the Declaration of Independence', hint: 'The moment 56 delegates proclaimed America free from British rule', facts: ['The Declaration of Independence was formally adopted by the Second Continental Congress on 4 July 1776 in Philadelphia', 'Principally written by Thomas Jefferson over 17 days; its second sentence — "We hold these truths to be self-evident, that all men are created equal" — is among the most celebrated in history', '56 delegates representing 13 colonies signed the document; John Hancock signed first, in large bold letters, reportedly so King George could read it without his spectacles', 'The signing was an act of treason against the British Crown — the delegates pledged "our Lives, our Fortunes and our sacred Honour"', '4 July is now Independence Day — America\'s national holiday; the Declaration inspired revolutions and independence movements around the world'] },
    { secret: 'Black Tuesday (Wall Street Crash)', hint: 'The 1929 stock market collapse that triggered the Great Depression', facts: ['On 29 October 1929 — Black Tuesday — the New York Stock Exchange collapsed in the most devastating stock market crash in US history', 'Over 16 million shares were traded in a single day of panic selling; stock prices fell catastrophically and billions of dollars of wealth were wiped out', 'The crash followed Black Thursday (24 October) when the market first began to plunge; frantic buying by bankers had briefly stabilised it before Tuesday\'s total collapse', 'Thousands of banks failed in the months that followed as loans could not be repaid; millions of Americans lost their life savings overnight', 'Triggered the Great Depression — a decade of global economic misery; US unemployment reached 25% and the suffering spread worldwide'] },
    { secret: 'Chinese Cultural Revolution', hint: 'Mao\'s decade of political terror that turned China upside down', facts: ['A socio-political movement launched by Mao Zedong in 1966 and lasting until his death in 1976, intended to purge capitalist and traditional elements from Chinese society', 'Mao mobilised millions of young "Red Guards" to attack intellectuals, teachers, officials and anyone branded a class enemy; schools and universities were shut down for years', 'An estimated 500,000 to 2 million people were killed; millions more were imprisoned, tortured or sent to rural labour camps for "re-education"', 'Priceless cultural artefacts, temples, books and historical sites were destroyed in an effort to eliminate China\'s "old culture, old customs, old habits and old ideas"', 'The period is regarded in China today as a catastrophic mistake; it was officially condemned by the Communist Party in 1981 as "responsible for the most severe setback and the heaviest losses suffered by the Party, the state and the people"'] },
    { secret: 'PRC Entry to the United Nations', hint: 'The 1971 vote that gave China\'s UN seat to Beijing and expelled Taiwan', facts: ['On 25 October 1971, the United Nations General Assembly passed Resolution 2758, recognising the People\'s Republic of China (PRC) as the sole lawful representative of China at the UN', 'The resolution expelled the Republic of China (Taiwan), which had held the China seat — including a permanent Security Council seat with veto power — since the UN\'s founding in 1945', 'The vote was 76 in favour, 35 against and 17 abstentions; the US had lobbied hard against the resolution but failed to prevent it', 'Albania had sponsored the resolution; when it passed, some delegates danced in the aisles — prompting a furious US Ambassador George H.W. Bush to call it a "moment of infamy"', 'China\'s entry transformed the UN\'s dynamics and was followed weeks later by Henry Kissinger\'s secret visit to Beijing, signalling a dramatic shift in US-China relations'] },
    { secret: 'Kissinger\'s Secret Visit to China', hint: 'The clandestine 1971 diplomatic mission that ended 25 years of US-China hostility', facts: ['In July 1971, US National Security Advisor Henry Kissinger secretly flew to Beijing for two days of talks with Chinese Premier Zhou Enlai — without the knowledge of the American public, Congress or most of the government', 'Kissinger feigned illness during a visit to Pakistan; he secretly boarded a Pakistani plane to Beijing on 9 July 1971', 'The mission was codenamed "Polo" — after Marco Polo — and laid the groundwork for President Nixon\'s historic visit to China in February 1972', 'The opening ended 25 years of complete US-China estrangement dating from the Communist victory in 1949 and transformed Cold War geopolitics', 'Kissinger later called it "the most important diplomatic mission I\'ve ever been on"; Nixon\'s China opening is considered one of the greatest diplomatic coups of the 20th century'] },
    { secret: 'End of Monarchy in Nepal', hint: 'The 2008 vote that abolished the world\'s last Hindu kingdom', facts: ['On 28 May 2008, Nepal\'s newly elected Constituent Assembly voted to abolish the 240-year-old Shah monarchy and declare Nepal a federal democratic republic', 'Nepal had been the world\'s only official Hindu kingdom; its monarchy traced its origins to Prithvi Narayan Shah, who unified Nepal in 1768', 'The move followed years of civil war between Maoist rebels and the royal government, the massacre of most of the royal family in 2001 and a popular uprising in 2006 that stripped King Gyanendra of most of his powers', 'King Gyanendra — who had seized absolute power in 2005 only to be humiliated by mass protests in 2006 — was given 15 days to vacate the Narayanhiti Royal Palace in Kathmandu', 'The palace became a museum; Nepal\'s transition to republic status was the culmination of a dramatic decade that transformed the Himalayan nation\'s political identity entirely'] },
    { secret: 'Yalta Conference', hint: 'The 1945 summit where the Big Three divided the post-war world', facts: ['A wartime summit held 4–11 February 1945 in Yalta, Crimea, between the "Big Three" Allied leaders: Roosevelt (USA), Churchill (UK) and Stalin (USSR)', 'Took place with WWII nearly won — Germany was encircled; the leaders met to plan the post-war world order before the fighting had even ended', 'Key decisions: Germany would be divided into occupation zones; free elections would be held in liberated Eastern Europe (a promise Stalin never kept); the Soviet Union would enter the war against Japan', 'Roosevelt and Churchill were later criticised for conceding too much to Stalin — the agreed "free elections" in Eastern Europe never materialised as Soviet satellite states were imposed instead', 'The conference effectively drew the map of the Cold War; the division of Europe it produced lasted until the fall of the Berlin Wall in 1989'] },
    { secret: 'Building of the Panama Canal', hint: 'The engineering marvel that connected the Atlantic and Pacific Oceans', facts: ['A 77-km ship canal across the Isthmus of Panama connecting the Atlantic and Pacific Oceans; construction under US control ran from 1904 to 1914', 'France had attempted to build the canal first (1881–1889) under Ferdinand de Lesseps, fresh from the Suez Canal; the project collapsed after 20,000 workers died from malaria and yellow fever', 'The US succeeded by first eliminating the mosquitoes that caused disease — a revolutionary public health campaign led by Dr William Gorgas', 'The canal was an engineering marvel: the Gatun Dam created the world\'s largest artificial lake; the Culebra Cut blasted through 13 km of solid rock', 'The Panama Canal opened on 15 August 1914 — the same week WWI began in Europe; it cut the sea voyage from New York to San Francisco from 22,500 km to 9,500 km; Panama gained full control of it on 31 December 1999'] },
    { secret: 'US Capture of Nicolás Maduro', hint: 'The 2026 American military operation that seized Venezuela\'s president', facts: ['On 3 January 2026, US forces launched Operation Absolute Resolve — a military strike on Venezuela that captured President Nicolás Maduro and his wife Cilia Flores from his compound in Caracas', 'Around 150 US jets launched from 20 airbases bombed Venezuelan air defence infrastructure across northern Venezuela before a special operations team seized Maduro in the early hours', 'Maduro and Flores were flown to New York City to face federal charges of narcoterrorism; they pleaded not guilty in Manhattan federal court on 5 January 2026', 'Several members of Maduro\'s security detail were killed in the raid; Cuba announced that 32 of its nationals "lost their lives in combat" during the operation', 'The operation divided the world: most of Latin America, Africa and Asia condemned it as a violation of international law and sovereignty; most NATO members expressed support', 'Nicolás Maduro had been President of Venezuela since 2013, succeeding Hugo Chávez; the US had indicted him in 2020 on narco-terrorism charges and offered a $15 million reward for information leading to his arrest', 'Venezuela under Maduro suffered one of history\'s worst economic collapses — hyperinflation reached 1,000,000% in 2018 and over 7 million Venezuelans fled the country by 2025', 'The operation was authorised by US President Donald Trump; Secretary of State Marco Rubio called it "justice served" — Trump had long threatened military action against Venezuela', 'Maduro\'s capture effectively ended his government; Venezuelan military units fragmented in the aftermath as acting officials scrambled to maintain control', 'The US charged Maduro under the Kingpin Act for allegedly flooding the United States with cocaine in partnership with Colombian FARC guerrillas — charges he denied as politically motivated'] },
    { secret: 'Election of Barack Obama', hint: 'The 2008 US presidential election that made history', facts: ['On 4 November 2008, Barack Obama was elected the 44th President of the United States, becoming the first African-American to win the presidency', 'Obama defeated Republican Senator John McCain with 365 Electoral College votes to McCain\'s 173, and won the popular vote with 52.9% — the highest share for a Democrat since 1964', 'Grant Park in Chicago erupted in celebration; an estimated 240,000 people gathered to hear his victory speech; emotional crowds formed worldwide, reflecting the historic nature of the moment', 'His campaign was built on the themes of "Hope" and "Change"; he raised a then-record $745 million and mobilised an unprecedented grassroots volunteer network', 'Obama\'s election came just 45 years after the Civil Rights Act (1964) and 143 years after the abolition of slavery; he was sworn in on 20 January 2009, with his hand on Abraham Lincoln\'s Bible'] },
    { secret: 'Hanging of Zulfikar Ali Bhutto', hint: 'The 1979 execution of Pakistan\'s elected prime minister', facts: ['Zulfikar Ali Bhutto, founder of the Pakistan Peoples Party and former Prime Minister of Pakistan, was hanged on 4 April 1979 in Rawalpindi Central Jail', 'He had been overthrown in a military coup by General Zia ul-Haq in July 1977, just months after winning a general election amid allegations of rigging', 'Bhutto was tried and convicted of authorising the murder of a political opponent — a verdict widely condemned internationally as politically motivated', 'His execution was protested by world leaders including US President Carter, UK Prime Minister Callaghan and Saudi King Khalid, all of whom appealed for clemency', 'He remains a hugely divisive figure in Pakistan: revered by supporters as a democratic martyr, criticised by opponents for authoritarian tendencies; his daughter Benazir Bhutto went on to become Pakistan\'s prime minister twice'] },
    { secret: 'US Invasion of Iraq', hint: 'The 2003 war launched over weapons of mass destruction that were never found', facts: ['On 20 March 2003, a US-led coalition invaded Iraq, toppling Saddam Hussein\'s government within three weeks in an operation called "Shock and Awe"', 'The invasion was justified by the claim that Iraq possessed weapons of mass destruction — no such weapons were ever found, making it one of the most consequential intelligence failures in history', 'President George W. Bush declared "Mission Accomplished" on 1 May 2003, but the war and subsequent insurgency dragged on for nearly a decade', 'Over 4,400 US troops and an estimated 150,000–600,000 Iraqi civilians died in the conflict and ensuing violence', 'Saddam Hussein was captured in December 2003 hiding in a hole near Tikrit; he was tried by an Iraqi tribunal and executed by hanging on 30 December 2006'] },
    { secret: 'Launch of the First iPhone', hint: 'The 2007 product reveal that put a computer in everyone\'s pocket', facts: ['On 9 January 2007, Apple CEO Steve Jobs announced the original iPhone at the Macworld Conference in San Francisco, calling it "an iPod, a phone, and an internet communicator" in one device', 'Jobs described it as "five years ahead of any other phone"; it combined a full touchscreen with no physical keyboard — a radical departure from every existing mobile phone', 'The iPhone went on sale on 29 June 2007; customers queued outside Apple Stores for days; the first model sold for $499 (4 GB) and $599 (8 GB)', 'The iPhone created the modern smartphone industry and destroyed the dominance of Nokia and BlackBerry within a few years', 'It spawned the App Store (2008) and an entire ecosystem; over 2.3 billion iPhones have been sold, making it the best-selling consumer electronics product in history'] },
    { secret: 'Paris Climate Agreement', hint: 'The 2015 global accord to limit temperature rise to 1.5°C', facts: ['Adopted on 12 December 2015 at the COP21 climate summit in Paris by 196 countries — the most ambitious international climate agreement ever reached', 'Countries pledged to limit global average temperature rise to well below 2°C above pre-industrial levels, and to pursue efforts to limit it to 1.5°C', 'Each country submitted its own Nationally Determined Contributions (NDCs) — voluntary targets for cutting emissions', 'The US under President Obama signed the agreement; President Trump withdrew the US in 2017; President Biden rejoined on his first day in office in 2021', 'Scientists warn that current pledges are still insufficient to meet the 1.5°C target and that the world is on track for 2.5–3°C of warming by 2100'] },
    { secret: 'Assassination of Martin Luther King Jr.', hint: 'The 1968 murder of America\'s greatest civil rights leader', facts: ['Martin Luther King Jr. was shot and killed on 4 April 1968 while standing on the balcony of the Lorraine Motel in Memphis, Tennessee', 'He had come to Memphis to support striking Black sanitation workers; the bullet struck him in the jaw and severed his jugular vein; he was pronounced dead at 7:05 PM', 'James Earl Ray, a white escaped convict, was arrested two months later at London\'s Heathrow Airport; he pleaded guilty and was sentenced to 99 years in prison', 'His assassination triggered riots in over 100 US cities; President Lyndon B. Johnson declared a national day of mourning; 50,000 people attended his funeral in Atlanta', 'King was 39 years old when he died; he had led the Montgomery Bus Boycott, the March on Washington and countless campaigns that reshaped American society'] },
    { secret: 'Martin Luther King\'s "I Have a Dream" Speech', hint: 'The 1963 address that defined the American civil rights movement', facts: ['Delivered on 28 August 1963 by Dr Martin Luther King Jr. on the steps of the Lincoln Memorial in Washington D.C., during the March on Washington for Jobs and Freedom', 'An estimated 250,000 people gathered on the National Mall — the largest demonstration in American history to that point', 'The phrase "I have a dream" was partly improvised; gospel singer Mahalia Jackson called out "Tell them about the dream, Martin!" as he spoke', 'King called for an end to racism and envisioned a future where people "will not be judged by the colour of their skin but by the content of their character"', 'Ranked the greatest American speech of the 20th century; it helped galvanise support for the Civil Rights Act (1964) and the Voting Rights Act (1965)'] },
    { secret: 'Russian Invasion of Ukraine', hint: 'The 2022 full-scale war that shocked Europe', facts: ['On 24 February 2022, Russia launched a full-scale invasion of Ukraine — the largest military attack in Europe since World War II', 'Russian President Vladimir Putin justified the invasion as a "special military operation" to "denazify" Ukraine; the real trigger was Ukraine\'s ambition to join NATO and the EU', 'The assault began with missile strikes across Ukraine and a ground advance from the north toward Kyiv, which Ukrainian forces repelled within weeks', 'Western nations responded with sweeping sanctions on Russia and billions of dollars in military aid to Ukraine; Russia was expelled from the SWIFT banking system', 'The war triggered the largest refugee crisis in Europe since WWII, with over 8 million Ukrainians fleeing abroad and millions more internally displaced'] },
    { secret: 'Launch of ChatGPT', hint: 'The 2022 AI chatbot that brought artificial intelligence to the mainstream', facts: ['ChatGPT was released by OpenAI on 30 November 2022 — a free public demo of a large language model capable of holding human-like conversations', 'It reached 1 million users in just 5 days and 100 million users within two months — the fastest product adoption in history at that time', 'Built on OpenAI\'s GPT-3.5 model, it could write essays, code, poetry and answer complex questions; its capabilities stunned the public and triggered a global AI arms race', 'Microsoft invested $10 billion in OpenAI and integrated ChatGPT into Bing and its Office suite; Google rushed out its own AI chatbot, Bard (later Gemini)', 'Its release accelerated debates about AI safety, job displacement, academic fraud and the existential risks of superintelligent AI; it is widely seen as the moment AI entered everyday life'] },
    { secret: 'Coronation of King Charles III', hint: 'The 2023 ceremony that crowned Britain\'s new monarch', facts: ['Charles III was crowned King of the United Kingdom and the Commonwealth realms on 6 May 2023 at Westminster Abbey — the first British coronation in 70 years', 'The ceremony was conducted by the Archbishop of Canterbury Justin Welby and combined ancient traditions dating back 1,000 years with modern, inclusive elements', 'Charles had acceded to the throne on 8 September 2022 immediately upon the death of his mother, Queen Elizabeth II, after the longest wait of any heir apparent in British history', 'Around 2,200 guests attended the Abbey service; an estimated 20 million people watched on TV in the UK and hundreds of millions worldwide', 'His wife Camilla was crowned Queen alongside him; the coronation crown used was St Edward\'s Crown, made in 1661, which weighs 2.23 kg (4.9 lb)', 'Charles Philip Arthur George was born on 14 November 1948; he became King at age 73 — the oldest person ever to ascend the British throne', 'The coronation incorporated multi-faith elements for the first time in British history: leaders from Islam, Judaism, Hinduism, Sikhism and Buddhism participated alongside Christian clergy', 'Westminster Abbey has hosted every English and British coronation since William the Conqueror in 1066; Charles III was the 40th monarch to be crowned there', 'A coronation concert at Windsor Castle the following day featured Katy Perry, Lionel Richie and others before a crowd of 20,000; the event was broadcast globally', 'Charles is a long-standing environmental advocate who championed sustainable farming, organic agriculture and conservation decades before climate change became mainstream political debate'] },
    { secret: 'Abdication of King Edward VIII', hint: 'The 1936 crisis in which a British king gave up his throne for love', facts: ['King Edward VIII abdicated the British throne on 11 December 1936 — the only British monarch ever to voluntarily give up the crown', 'He chose to abdicate in order to marry Wallis Simpson, a twice-divorced American socialite, which the British government and Church of England considered constitutionally and morally unacceptable', 'His abdication speech, broadcast live on radio, is one of the most famous in history: "I have found it impossible to carry the heavy burden of responsibility and to discharge my duties as King as I would wish to do without the help and support of the woman I love"', 'His younger brother Albert was crowned King George VI the following year — the father of Queen Elizabeth II', 'Edward was given the title Duke of Windsor; he and Wallis Simpson married in France in June 1937 and lived largely in exile for the rest of their lives'] },
    { secret: 'End of Apartheid', hint: 'The dismantling of South Africa\'s racial segregation system', facts: ['Apartheid — a system of institutionalised racial segregation — was officially ended in South Africa in 1991 when President F.W. de Klerk repealed the last of the apartheid laws', 'The system had been in place since 1948, classifying people by race and enforcing strict separation in schools, hospitals, beaches, buses and every area of public life', 'Nelson Mandela, imprisoned for 27 years on Robben Island, was released on 11 February 1990 and led negotiations with de Klerk to dismantle apartheid', 'South Africa\'s first fully democratic election was held on 27 April 1994; Nelson Mandela was elected President with 62% of the vote', 'De Klerk and Mandela jointly received the Nobel Peace Prize in 1993 for their roles in peacefully ending apartheid; 27 April is now celebrated as Freedom Day in South Africa'] },
    { secret: 'Death of Muammar Gaddafi', hint: 'The 2011 killing of Libya\'s longtime dictator during the Arab Spring', facts: ['Muammar Gaddafi, who had ruled Libya for 42 years, was captured and killed on 20 October 2011 in his hometown of Sirte during the Libyan Civil War', 'He was found hiding in a drainage pipe after NATO airstrikes hit his convoy as it tried to flee; he was beaten by rebel fighters and shot dead — the circumstances remained disputed', 'His death came during the Arab Spring; Gaddafi had responded to protests earlier that year by unleashing military force on civilians, prompting a NATO-backed no-fly zone', 'Gaddafi had come to power in a 1969 coup aged just 27; his 42-year rule made him one of the world\'s longest-serving leaders', 'His death left Libya without functioning state institutions; the country descended into years of civil war and became a major transit point for migrants crossing to Europe'] },
    { secret: 'Capture of Saddam Hussein', hint: 'The 2003 moment US troops found Iraq\'s ousted dictator hiding underground', facts: ['Saddam Hussein, former President of Iraq, was captured by US forces on 13 December 2003 near his hometown of Tikrit, in an operation codenamed Operation Red Dawn', 'He was found hiding in a small underground hole — dubbed a "spider hole" — on a farm; he was dishevelled and armed with a pistol but surrendered without resistance', 'His capture came nine months after the US-led invasion of Iraq; he was identified by a senior member of his own security detail who led soldiers to his hiding place', 'US Administrator L. Paul Bremer announced the capture with the words: "Ladies and gentlemen, we got him"', 'Saddam was handed over to Iraqi authorities, tried for crimes against humanity — including the massacre of 148 Shia Muslims in Dujail — and executed by hanging on 30 December 2006'] },
    { secret: 'Creation of the Nobel Prize', hint: 'The legacy of a dynamite inventor who wanted to be remembered for peace', facts: ['Alfred Nobel, the Swedish inventor of dynamite, established the Nobel Prize in his will signed on 27 November 1895, one year before his death', 'Horrified by a premature obituary that called him the "merchant of death," Nobel left 94% of his fortune — 31 million Swedish kronor — to fund annual prizes in Physics, Chemistry, Medicine, Literature and Peace', 'The first Nobel Prizes were awarded on 10 December 1901, the fifth anniversary of Nobel\'s death; the Economics prize was added in 1968', 'The Peace Prize is awarded in Oslo, Norway; all other prizes are awarded in Stockholm, Sweden — a distinction Nobel specified in his will', 'Over 1,000 individuals and organisations have received the prize; notable laureates include Marie Curie (only person to win in two sciences), Martin Luther King Jr., and Malala Yousafzai (youngest ever laureate at age 17)'] },
    { secret: 'Discovery of Penicillin', hint: 'The accidental 1928 finding that revolutionised medicine', facts: ['Alexander Fleming discovered penicillin on 3 September 1928 at St Mary\'s Hospital in London — by accident, after noticing that mould had contaminated and killed bacteria on a petri dish he had left out', 'The mould was Penicillium notatum; Fleming published his findings but lacked the means to purify the substance for medical use', 'Howard Florey and Ernst Boris Chain at Oxford University developed penicillin into a usable drug in 1940–41; mass production began in the USA during World War II', 'Fleming, Florey and Chain shared the 1945 Nobel Prize in Physiology or Medicine for the discovery and development of penicillin', 'Penicillin is estimated to have saved over 200 million lives; it transformed medicine by making previously fatal bacterial infections — pneumonia, syphilis, scarlet fever — routinely treatable'] },
    { secret: 'Launch of Sputnik', hint: 'The 1957 satellite launch that started the Space Race', facts: ['On 4 October 1957, the Soviet Union launched Sputnik 1 — the world\'s first artificial satellite — into Earth orbit, shocking the United States and the world', 'Sputnik was a polished metal sphere 58 cm in diameter, weighing 83.6 kg; it orbited Earth every 96 minutes and transmitted a simple radio beep detectable by amateur radio operators worldwide', 'Its launch demonstrated that the USSR had rockets powerful enough to carry a nuclear warhead to any point on Earth, triggering immediate alarm in the West', 'The US response was swift: NASA was created in 1958, and President Kennedy pledged in 1961 to land a man on the Moon before the decade was out', 'Sputnik completed 1,440 orbits before burning up on re-entry on 4 January 1958; it is widely credited with launching the Space Age and the space race between the superpowers'] },
    { secret: 'The Long March', hint: 'The 1934–35 strategic retreat that saved China\'s Communist Party', facts: ['The Long March was a massive military retreat by China\'s Red Army from October 1934 to October 1935, covering approximately 9,000 km (5,600 miles) across treacherous terrain', 'It began when Nationalist (Kuomintang) forces surrounded Communist bases in Jiangxi; around 100,000 soldiers broke out and marched through mountains, swamps and rivers to reach safety in Yan\'an', 'Fewer than 10,000 of the original 100,000 completed the march; tens of thousands died from combat, cold, starvation and disease', 'The march cemented Mao Zedong\'s leadership of the Communist Party, which he had assumed during the journey at the Zunyi Conference in January 1935', 'The Long March became a founding myth of the People\'s Republic of China — a symbol of Communist perseverance and sacrifice that Mao invoked for decades to legitimise the Party\'s rule'] },
    { secret: 'Introduction of the Euro', hint: 'The 1999 launch of Europe\'s single currency', facts: ['The Euro (€) was introduced as an electronic currency on 1 January 1999, replacing the national currencies of 11 EU member states at fixed exchange rates', 'Euro banknotes and coins entered physical circulation on 1 January 2002 in 12 countries; national currencies like the German Mark, French Franc and Italian Lira were withdrawn within months', 'The Euro is now the official currency of 20 of the 27 EU member states, collectively known as the Eurozone, covering about 350 million people', 'It is the world\'s second most traded currency after the US dollar, accounting for about 20% of global foreign exchange reserves', 'The 2010–2015 Eurozone debt crisis — triggered by excessive borrowing in Greece, Ireland, Portugal and Spain — tested the currency\'s survival; the ECB\'s intervention ultimately stabilised it'] },
    { secret: 'First Ascent of Mount Everest', hint: 'The 1953 conquest of the world\'s highest peak', facts: ['On 29 May 1953, Edmund Hillary of New Zealand and Tenzing Norgay, a Sherpa from Nepal, became the first people confirmed to have reached the summit of Mount Everest at 8,849 m (29,032 ft)', 'They were part of a British expedition led by Colonel John Hunt; Hillary and Tenzing spent about 15 minutes at the summit before descending', 'The news reached London on the morning of Queen Elizabeth II\'s coronation — 2 June 1953 — and was treated as a coronation gift to the nation', 'Hillary was knighted; Tenzing received the George Medal; both became global celebrities and symbols of human achievement', 'Over 6,000 people have since summited Everest; more than 300 have died attempting it; the peak has become increasingly crowded, raising concerns about commercialisation and environmental damage'] },
    { secret: 'Hijrah of Prophet Muhammad', hint: 'The 622 AD migration that marks the start of the Islamic calendar', facts: ['The Hijrah refers to the migration of the Prophet Muhammad and his followers from Mecca to Medina (then called Yathrib) in 622 AD, fleeing persecution by the Quraysh tribe', 'The journey took place in September 622 AD; Muhammad and his companion Abu Bakr hid in the Cave of Thawr for three days to evade pursuers before completing the journey', 'In Medina, Muhammad established the first Islamic state, drafted the Constitution of Medina — one of the world\'s earliest constitutional documents — and built the first mosque', 'The Islamic lunar calendar (Hijri calendar) begins from this migration; the year 622 AD is year 1 AH (Anno Hegirae — "in the year of the Hijra")', 'The Hijrah is considered the most pivotal event in Islamic history; it transformed a persecuted community into a organised political and religious state that would spread across the world'] },
    { secret: 'Parting of the Red Sea', hint: 'The biblical miracle in which Moses led the Israelites to safety through the sea', facts: ['According to the Book of Exodus, Moses parted the Red Sea to allow the Israelites to escape from the pursuing army of the Egyptian Pharaoh after their liberation from slavery', 'God commanded Moses to stretch his hand over the sea; the waters divided and the Israelites crossed on dry ground; when Pharaoh\'s army followed, the waters closed over them', 'The Pharaoh and his army drowned in the returning waters — an event celebrated in the Passover (Pesach) tradition observed by Jews worldwide to this day', 'The event is also referenced in the Quran (Surah Al-Baqarah and Surah Al-A\'raf), where it is described as one of the miracles granted to Moses (Musa)', 'The exact historical date and location are debated by scholars; some researchers have proposed natural explanations involving wind setdown or a tsunami, while believers regard it as a divine miracle'] },
  ],
  object: [
    { secret: 'Excalibur', hint: 'A legendary sword from Arthurian legend', facts: ['The magical sword of King Arthur in British legend and medieval romance', 'In most versions, pulled from a stone or given by the Lady of the Lake', 'Symbolised Arthur\'s divine right to rule as King of Britain', 'Said to be unbreakable and grant its bearer extraordinary power', 'Returned to the lake at Arthur\'s death — thrown by the knight Sir Bedivere'] },
    { secret: 'The Rosetta Stone', hint: 'An ancient stone that unlocked a forgotten script', facts: ['A granodiorite stele discovered in 1799 by French soldiers in Egypt', 'Inscribed with the same decree in three scripts: hieroglyphs, Demotic, and Ancient Greek', 'The Greek section let scholars decode Egyptian hieroglyphics for the first time', 'Jean-François Champollion cracked the hieroglyphic code in 1822', 'Held in the British Museum since 1802; Egypt regularly requests its return'] },
    { secret: 'The Hope Diamond', hint: 'A famously cursed blue gemstone', facts: ['One of the world\'s largest blue diamonds, weighing 45.52 carats', 'Believed to have originated in India; first recorded in the 17th century', 'Said to carry a curse bringing misfortune and death to its owners', 'Its history includes French royal ownership and theft during the Revolution', 'Now on display at the Smithsonian Natural History Museum in Washington D.C.'] },
    { secret: 'The Holy Grail', hint: 'A sacred vessel from Christian and Arthurian tradition', facts: ['Believed to be the cup used by Jesus at the Last Supper', 'Also said to be the cup that caught Christ\'s blood at the Crucifixion', 'The supreme quest of the Knights of the Round Table in Arthurian legend', 'No verified physical version has ever been confirmed to exist', 'Inspired works from medieval romance to Monty Python and Indiana Jones'] },
    { secret: 'The Mona Lisa', hint: 'The world\'s most famous painting', facts: ['Painted by Leonardo da Vinci between approximately 1503 and 1519', 'Subject is believed to be Lisa Gherardini, wife of a Florentine merchant', 'Famous for her ambiguous smile and eyes that seem to follow the viewer', 'Stolen from the Louvre in 1911 by an Italian employee; recovered two years later', 'Now behind bulletproof glass at the Louvre, Paris — visited by millions yearly'] },
    { secret: 'The Ark of the Covenant', hint: 'A sacred container from ancient Hebrew scripture', facts: ['A gold-covered wooden chest said to hold the stone tablets of the Ten Commandments', 'Built under Moses\' instructions during the Israelites\' time in the wilderness', 'Said to have miraculous powers — killing those who touched it improperly', 'Kept in Solomon\'s Temple until the Babylonian conquest around 597 BC', 'Its current location is unknown and has inspired centuries of legend and searching'] },
    { secret: 'Kohinoor Diamond', hint: 'A legendary diamond now in the British Crown Jewels', facts: ['One of the largest cut diamonds in the world, weighing 105.6 carats; name means "Mountain of Light" in Persian', 'Originated in India; first mentioned in Mughal records in the early 17th century', 'Changed hands through conquest among Mughals, Persians, Afghans and Sikhs over three centuries', 'Came to Britain in 1849 after the British annexed Punjab; presented to Queen Victoria in 1850', 'Set in the Crown of Queen Elizabeth (the Queen Mother); India, Pakistan and Afghanistan all claim it'] },
    { secret: 'Pandora\'s Box', hint: 'A mythological container that released all the world\'s evils', facts: ['From Greek mythology — a container given to Pandora, the first woman, by Zeus as punishment', 'Zeus told her never to open it; overwhelmed by curiosity, she did', 'All evils and miseries — disease, death, sorrow, hunger — escaped from the box', 'Only Hope (Elpis) remained inside when she slammed it shut', '"Opening Pandora\'s box" now means triggering an uncontrollable cascade of problems'] },
    { secret: 'The Philosopher\'s Stone', hint: 'A legendary substance sought by alchemists to create gold and eternal life', facts: ['A legendary alchemical substance believed to turn base metals like lead into gold', 'Also said to produce the Elixir of Life — a potion granting immortality', 'Sought for centuries by alchemists across Europe and the Arab world; the quest shaped early chemistry', 'Nicolas Flamel, a real 15th-century French scribe, became legend for supposedly finding it', 'Today the phrase means something that solves all problems or magically transforms everything'] },
    { secret: 'Zulfiqar (Sword of Ali)', hint: 'The legendary double-bladed sword of a great Islamic hero', facts: ['The legendary sword of Hazrat Ali ibn Abi Talib (RA), cousin and son-in-law of Prophet Muhammad (PBUH)', 'Said to have been given to Ali by the Prophet himself', 'Described in tradition as having a double-pointed (bifurcated) blade — giving it an unmistakable appearance', 'Famous in Islamic tradition for Ali\'s extraordinary bravery in battle; became a symbol of justice and power', 'The saying "There is no sword but Zulfiqar, and no hero but Ali" echoes from the Battle of Uhud'] },
    { secret: 'Durandal', hint: 'The indestructible sword of Charlemagne\'s great knight', facts: ['The legendary sword of Roland, the greatest knight (paladin) of Charlemagne\'s court', 'Said to be the sharpest sword in existence, with holy relics sealed inside its golden hilt', 'Roland used it to cut through stone and armies in battle', 'When dying at Roncevaux Pass (778 AD), Roland tried to destroy it — he struck rock and split the rock instead', 'A rock with a sword in Rocamadour, France, is locally said to be Durandal itself'] },
    { secret: 'Lightsaber', hint: 'The weapon of Jedi and Sith in Star Wars', facts: ['The iconic weapon of the Jedi and Sith in George Lucas\'s Star Wars universe, first seen in 1977', 'A sword-like weapon with a blade of pure plasma energy; can cut through almost anything', 'Different colours carry meaning: blue and green for Jedi, red for Sith, purple for Mace Windu', 'Each Jedi builds their own lightsaber in a ceremony called Kyber crystal attunement', 'One of cinema\'s most recognisable props; real-world laser replicas have been built by scientists'] },
    { secret: 'Aladdin\'s Lamp', hint: 'A magical lamp containing a wish-granting Genie', facts: ['A magical oil lamp from the story of Aladdin in One Thousand and One Nights (Arabian Nights)', 'Contains a powerful Genie (Djinn) who emerges when the lamp is rubbed and grants three wishes', 'In the original tale, Aladdin is tricked by a sorcerer into fetching the lamp from a cave', 'He uses the Genie\'s power to win a princess, build a palace, and defeat the sorcerer', 'Has become a universal symbol of hidden power and the magic of wishes'] },
    { secret: 'The Flying Carpet', hint: 'A magical mode of transport from Arabian legend', facts: ['A legendary flying carpet found in Middle Eastern and South Asian folklore', 'Features in One Thousand and One Nights and stories of Arabian mythology', 'In Islamic legend, said to have been gifted to King Solomon — able to carry his entire army through the air', 'Transports its rider to any destination instantly by command', 'Most famously depicted in Disney\'s Aladdin (1992), carrying Aladdin and Jasmine on a moonlit ride'] },
    { secret: 'The Peacock Throne', hint: 'A magnificent jewelled throne of the Mughal Empire', facts: ['A famous jewelled throne commissioned by Mughal Emperor Shah Jahan in the 1630s in Delhi', 'Said to have taken 7 years to build and encrusted with diamonds, rubies, emeralds and pearls', 'Named for two peacock figures at its back with tails of inlaid gemstones', 'Looted and taken to Persia when Nadir Shah sacked Delhi in 1739; broken up and scattered after his death', 'The original is lost to history; today\'s Iranian "Peacock Throne" is a later creation'] },
    { secret: 'Dead Sea Scrolls', hint: 'Ancient manuscripts found in caves near the Dead Sea', facts: ['Ancient Jewish manuscripts discovered in caves near Qumran, Dead Sea, between 1947 and 1956', 'First found by Bedouin shepherds in 1947; the discovery revolutionised understanding of Judaism and early Christianity', 'Include the oldest known copies of books of the Hebrew Bible, some dating to the 3rd century BC', 'Also include non-biblical texts — hymns, wisdom writings and community rules', 'Now housed in the Shrine of the Book at the Israel Museum in Jerusalem'] },
    { secret: 'The Terracotta Army', hint: 'Thousands of clay soldiers buried with China\'s first emperor', facts: ['A collection of over 8,000 life-size clay soldiers, horses and chariots buried with Emperor Qin Shi Huang, around 210 BC', 'Discovered accidentally in 1974 by farmers digging a well near Xi\'an, China', 'Each soldier has unique facial features; some scholars believe they were modelled on real soldiers', 'Created to guard the Emperor in the afterlife inside his vast underground burial complex', 'Only a fraction of the site has been excavated; the Emperor\'s actual tomb mound remains sealed and unopened'] },
    { secret: 'The Trojan Horse', hint: 'A giant wooden horse that hid Greek soldiers inside', facts: ['A giant wooden horse used by the Greeks to secretly enter and conquer the city of Troy, in Greek mythology', 'After years of failed siege, the Greeks pretended to sail away and left the horse as a "gift"', 'Inside the hollow horse hid a select group of Greek warriors', 'The Trojans brought the horse inside their city walls; at night the Greeks crept out and opened the gates', '"Trojan horse" now means any trick or deception that bypasses defences from within'] },
    { secret: 'The Shroud of Turin', hint: 'A linen cloth believed by millions to bear the image of Jesus', facts: ['A linen cloth approximately 4.4 metres long bearing the faint image of a man with wounds consistent with crucifixion', 'Kept in the Cathedral of St John the Baptist in Turin, Italy — one of the most venerated relics in Christianity', 'Believers hold it to be the burial cloth of Jesus Christ; the image shows a face, hands and body in negative photographic form', 'Radiocarbon dating in 1988 dated the cloth to 1260–1390 AD; many scientists and believers dispute the testing methodology', 'Despite scientific scrutiny lasting decades, no consensus on how the image was formed has ever been reached'] },
    { secret: 'The Liberty Bell', hint: 'The cracked American bell that symbolises freedom and independence', facts: ['A large copper and tin bell in Philadelphia, Pennsylvania, a symbol of American independence', 'Originally hung in the Pennsylvania State House (now Independence Hall); cast in London in 1751', 'The famous crack developed sometime in the 19th century — possibly after being rung to mark George Washington\'s birthday in 1846', 'Inscribed with the words: "Proclaim LIBERTY throughout all the Land unto all the Inhabitants thereof" — from the Book of Leviticus', 'Became a symbol of the abolitionist movement, which adopted its motto; now displayed in the Liberty Bell Center near Independence Hall'] },
    { secret: 'The Bayeux Tapestry', hint: 'An embroidered cloth depicting the Norman Conquest of England in 1066', facts: ['An embroidered cloth approximately 70 metres long depicting the events leading to the Norman Conquest of England', 'Created around 1070 AD, probably commissioned by Bishop Odo of Bayeux, half-brother of William the Conqueror', 'Tells the story of the Battle of Hastings (1066) and the events surrounding it from the Norman perspective', 'Contains 626 figures of people, 202 horses, 55 dogs and numerous birds, ships and buildings in vivid detail', 'Kept in Bayeux, Normandy, France; France and the UK have debated its loan to the British Museum for a planned exhibition'] },
    { secret: 'Fabergé Eggs', hint: 'Jewelled Easter eggs made for the Russian Tsars', facts: ['Imperial Easter eggs created by the jewellery firm of Peter Carl Fabergé for the Russian imperial family from 1885 to 1917', 'Each egg was unique and astonishingly lavish — made of gold, precious stones and enamel — with a surprise inside', 'Tsar Alexander III commissioned the first as an Easter gift for his wife Maria Feodorovna; 50 were ultimately made for the Tsars', 'After the Russian Revolution, the Bolsheviks seized most of the eggs; many were sold abroad to raise foreign currency', '43 of the 50 Imperial eggs are known to survive; each is worth tens of millions of pounds and held by museums and collectors worldwide'] },
    { secret: 'The Amber Room', hint: 'A gilded amber chamber looted by Nazis and never found', facts: ['An ornate room in the Catherine Palace near St Petersburg, Russia, whose walls were covered in panels of amber, gold leaf and mirrors', 'Originally built in Prussia (1701–1707), it was given to Tsar Peter the Great by King Frederick William I of Prussia in 1716 as a diplomatic gift', 'Estimated to be worth over $500 million today — often called "the eighth wonder of the world"', 'Looted by Nazi Germany during WWII, dismantled and shipped to Königsberg (now Kaliningrad); it vanished as the war ended in 1945', 'Its whereabouts remain one of history\'s greatest unsolved mysteries; Russia reconstructed a replica, completed in 2003'] },
    { secret: 'The Declaration of Independence', hint: 'The 1776 document that proclaimed the United States a free nation', facts: ['A statement adopted by the Second Continental Congress on 4 July 1776, declaring the thirteen American colonies independent from British rule', 'Principally written by Thomas Jefferson; its famous second sentence begins "We hold these truths to be self-evident, that all men are created equal"', 'Signed by 56 delegates representing the thirteen colonies; John Hancock\'s signature is the largest and most famous', 'The original document is preserved in the National Archives in Washington D.C., displayed alongside the US Constitution', '4 July (Independence Day) is now the USA\'s national holiday; the document inspired independence movements and constitutions worldwide'] },
    { secret: 'The Crown Jewels', hint: 'Britain\'s most precious royal regalia, kept in the Tower of London', facts: ['The ceremonial regalia and robes of the British monarch, kept in the Jewel House at the Tower of London', 'The collection includes crowns, sceptres, orbs, swords and other items used in coronation ceremonies', 'St Edward\'s Crown — the centrepiece — dates to 1661 and is used only for the moment of coronation', 'The Koh-i-Noor diamond (105.6 carats), currently set in the Queen Mother\'s Crown, is claimed by India, Pakistan and Afghanistan', 'Over 5 million people visit the Crown Jewels at the Tower of London each year, making it one of the UK\'s most visited attractions'] },
    { secret: 'The Golden Fleece', hint: 'The mythical magical fleece sought by Jason and the Argonauts', facts: ['In Greek mythology, the fleece of a winged golden ram, kept in the kingdom of Colchis (modern Georgia)', 'Guarded by a dragon that never sleeps; the hero Jason led the Argonauts on a quest to retrieve it', 'Jason succeeded with the help of the Colchian princess Medea, a sorceress who fell in love with him', 'The fleece was said to grant kingship to whoever possessed it — Jason needed it to claim his rightful throne from his uncle Pelias', 'The story is one of the oldest adventure narratives in history; it possibly reflects real ancient Greek trade and exploration routes to the Black Sea'] },
    { secret: 'Mjolnir', hint: 'The magical hammer of Thor, the Norse god of thunder', facts: ['The legendary hammer of Thor in Norse mythology; the most powerful weapon in the Norse pantheon', 'Forged by the dwarf brothers Sindri and Brokkr; had a slightly short handle because Loki (as a fly) bit Brokkr\'s eyelid during the forging', 'Thor used it to battle giants, slay monsters and protect Asgard; it could level mountains and always returned to his hand when thrown', 'Said to be so heavy no ordinary being could lift it — only the worthy could wield it (a detail adopted by Marvel)', 'An iconic symbol of Norse culture; Viking Age Norse people wore Mjolnir pendants as protective amulets, many of which survive archaeologically'] },
    { secret: 'The One Ring', hint: 'The dark lord Sauron\'s ring of ultimate power from The Lord of the Rings', facts: ['The central artefact in J.R.R. Tolkien\'s The Lord of the Rings — forged by the dark lord Sauron in the fires of Mount Doom', 'Gave its wearer invisibility and extended life, but slowly corrupted and enslaved the wearer\'s will to Sauron', 'Inscribed in the Black Speech of Mordor: "One Ring to rule them all, One Ring to find them..."', 'Frodo Baggins was tasked with carrying it to Mount Doom to destroy it — the central quest of Tolkien\'s epic', 'First appeared in The Hobbit (1937) as a simple "magic ring" before Tolkien gave it its dark history in The Lord of the Rings (1954)'] },
    { secret: 'The Spear of Destiny', hint: 'The Roman lance said to have pierced Christ\'s side at the Crucifixion', facts: ['A legendary lance said to be the spear used by the Roman soldier Longinus to pierce the side of Jesus Christ at the Crucifixion', 'Also called the Holy Lance or Holy Spear; legend holds that whoever possesses it controls the destiny of the world', 'Multiple relics claimed to be the true spear exist in Vienna, the Vatican, Kraków and Echmiadzin, Armenia', 'Adolf Hitler became obsessed with the Vienna version after seeing it in a museum as a young man; he seized it after annexing Austria in 1938', 'US Army General Patton was fascinated by the legend; American forces recovered it from Nuremberg hours before Hitler\'s suicide in 1945'] },
    { secret: 'Olympic Torch', hint: 'The flame carried by relay runners to open every modern Olympic Games', facts: ['A flame lit in Olympia, Greece using a parabolic mirror to focus sunlight, then carried by relay to the Olympic host city', 'The torch relay was introduced at the 1936 Berlin Olympics — ironically by the Nazi regime seeking to link their Games to ancient Greek heritage', 'The flame is lit several months before the Games; thousands of torchbearers carry it across countries before the final runner lights the Olympic cauldron at the Opening Ceremony', 'The flame is carefully protected — a "mother flame" is kept in a safety lantern in case the torch goes out during the relay', 'The relay covers tens of thousands of kilometres; special arrangements are made for ocean crossings and extreme weather'] },
    { secret: 'Sputnik 1', hint: 'The world\'s first artificial satellite, launched by the USSR in 1957', facts: ['The world\'s first artificial satellite, launched by the Soviet Union on 4 October 1957', 'A polished aluminium sphere just 58 cm in diameter with four external radio antennas; visible to the naked eye from Earth', 'Completed an orbit of the Earth every 96 minutes and transmitted a simple radio beeping signal', 'Its launch shocked the Western world — demonstrating that the USSR had rockets powerful enough to potentially deliver nuclear warheads to any point on Earth', 'Triggered the Space Race: the US Congress passed the National Aeronautics and Space Act in 1958, creating NASA in direct response'] },
    { secret: 'Noah\'s Ark', hint: 'The great vessel built to survive God\'s flood, in Biblical and Quranic tradition', facts: ['In the Biblical and Quranic traditions, a massive wooden vessel built by Prophet Noah (Nuh) on God\'s command to survive a great flood', 'God instructed Noah to take aboard pairs of every living creature, along with his family, to survive the deluge', 'The Bible describes it as 300 cubits long, 50 wide and 30 tall — approximately 137 metres in length', 'In the Quran, Noah preached for 950 years before the flood; only a handful of believers joined him on the Ark', 'Said to have come to rest on Mount Ararat in modern Turkey; expeditions have searched for physical evidence without conclusive results'] },
    { secret: 'The Gutenberg Bible', hint: 'The first major book printed using movable type in the Western world', facts: ['Printed by Johannes Gutenberg around 1455 in Mainz, Germany — the first major book produced using movable metal type in Europe', 'Approximately 180 copies were printed; 49 survive today, making it one of the world\'s most valuable books', 'Each copy contains 1,282 pages; the text is the Latin Vulgate Bible, printed in a Gothic typeface that mimics handwriting', 'Producing a single manuscript Bible by hand had previously taken years; Gutenberg could print 180 copies faster and more cheaply', 'No complete Gutenberg Bible has appeared on the market since 1978; incomplete copies have sold for tens of millions of dollars'] },
    { secret: 'The Jolly Roger', hint: 'The skull-and-crossbones flag flown by pirates', facts: ['The traditional flag flown by pirates at sea — a skull and crossed bones on a black background', 'The term "Jolly Roger" first appears in English in the 18th century; the origin of the name is debated', 'The black flag signalled that the pirates were willing to accept surrender; a red flag meant no quarter — no survivors', 'Famous pirate captains had personalised versions: Blackbeard flew a skeleton stabbing a heart; Bartholomew Roberts used a skeleton dancing with hourglass', 'The skull-and-crossbones design is now used worldwide as a symbol of danger and poison on hazardous materials'] },
  ],
  place: [
    { secret: 'The Great Wall of China', hint: 'A massive ancient fortification in East Asia', facts: ['A series of walls built across northern China over many centuries', 'Most of what stands today is from the Ming dynasty (1368–1644)', 'Stretches roughly 21,196 km in total length including all branches', 'Popular myth: it is NOT visible from space with the naked eye', 'Built primarily to defend against Mongol and nomadic invasions from the north'] },
    { secret: 'The Eiffel Tower', hint: 'A famous iron structure in a European capital', facts: ['Designed by engineer Gustave Eiffel for the 1889 World\'s Fair in Paris', 'Standing 330 metres tall, it was the world\'s tallest structure for 41 years', 'Made from 18,038 pieces of iron, assembled with 2.5 million rivets', 'Originally planned to be demolished after 20 years; saved because it served as a radio tower', 'Receives about 7 million visitors per year — one of the world\'s most visited monuments'] },
    { secret: 'Machu Picchu', hint: 'An ancient citadel high in the South American Andes', facts: ['A 15th-century Inca citadel in Peru, at 2,430 metres elevation', 'Built around 1450 AD, abandoned less than 100 years later during the Spanish conquest', 'Rediscovered by American historian Hiram Bingham in 1911', 'Built without mortar — the stones fit so precisely a knife cannot fit between them', 'A UNESCO World Heritage Site and one of the New Seven Wonders of the World'] },
    { secret: 'The Colosseum', hint: 'An ancient amphitheatre in the heart of Rome', facts: ['An oval amphitheatre in Rome built between 70–80 AD under Emperor Vespasian', 'Could hold 50,000 to 80,000 spectators for gladiatorial and other public events', 'Used for gladiator fights, animal hunts, public executions, and dramatic performances', 'Estimated over 400,000 people and 1 million animals died within its walls', 'Two-thirds of the original structure was lost to earthquakes and stone robbing over centuries'] },
    { secret: 'The Taj Mahal', hint: 'A white marble mausoleum in India', facts: ['A white marble mausoleum in Agra, India, built by Mughal Emperor Shah Jahan', 'Commissioned in 1632 as a tomb for his wife Mumtaz Mahal, who died in childbirth', 'Took approximately 22 years and 22,000 workers to complete', 'The minarets lean slightly outward so they fall away from the tomb in an earthquake', 'A UNESCO World Heritage Site and one of the New Seven Wonders of the World'] },
    { secret: 'Mount Everest', hint: 'The world\'s highest mountain above sea level', facts: ['Located in the Himalayas on the Nepal–Tibet border at 8,848.86 metres', 'Named after Sir George Everest, the British surveyor who first mapped it', 'First summited on 29 May 1953 by Edmund Hillary and Tenzing Norgay', 'Known locally as "Sagarmatha" in Nepal and "Chomolungma" in Tibet', 'Over 300 bodies remain on the mountain — too dangerous and costly to recover'] },
    { secret: 'Pyramids of Giza', hint: 'The only surviving Wonder of the Ancient World', facts: ['The Great Pyramid (built c.2560 BC) was the tallest man-made structure in the world for 3,800 years', 'Three major pyramids were built for Pharaohs Khufu, Khafre and Menkaure on the Giza plateau near Cairo', 'The Great Pyramid was built with approximately 2.3 million stone blocks, averaging 2.5 to 15 tonnes each', 'Originally stood 146.5 metres tall; now stands at 138.8 metres after erosion', 'The only one of the original Seven Wonders of the Ancient World still standing'] },
    { secret: 'Stonehenge', hint: 'A prehistoric stone circle on an English plain', facts: ['A prehistoric stone circle monument on Salisbury Plain, Wiltshire, England; built in phases from 3000–1500 BC', 'The largest Sarsen stones weigh up to 25 tonnes and came from Marlborough Downs, 25 km away', 'Smaller Bluestones were transported from the Preseli Hills in Wales — over 240 km away', 'Its exact purpose remains debated: burial site, astronomical calendar, healing centre, or ceremonial space', 'Precisely aligned with the sunrise at summer solstice and sunset at winter solstice'] },
    { secret: 'Petra (The Rose City)', hint: 'An ancient city carved into rose-red rock in Jordan', facts: ['An ancient Nabataean city carved directly into rose-red rock cliffs in southern Jordan', 'Established as early as the 4th century BC; became the capital of the Nabataean Kingdom', 'Its most famous structure is Al-Khazneh (The Treasury) — a stunning façade cut into the cliff face', 'At its peak, Petra had a population of 20,000 at the crossroads of ancient incense trade routes', 'One of the New Seven Wonders of the World; hidden from Western knowledge until 1812 when it was rediscovered'] },
    { secret: 'Acropolis of Athens', hint: 'A rocky hill topped by ancient Greek temples', facts: ['A rocky citadel overlooking Athens, Greece, topped by some of antiquity\'s finest architecture', 'The Parthenon (447–432 BC) was dedicated to goddess Athena and is the most famous structure on the Acropolis', 'Originally housed a giant gold and ivory statue of Athena created by sculptor Phidias', 'The Elgin Marbles — sculptures removed by Lord Elgin in 1801 — are in the British Museum; Greece demands their return', 'A UNESCO World Heritage Site and enduring symbol of Western civilisation and democracy'] },
    { secret: 'Angkor Wat', hint: 'The world\'s largest religious monument, in Cambodia', facts: ['A vast Hindu-Buddhist temple complex in Cambodia, built by King Suryavarman II in the early 12th century', 'The largest religious monument in the world, covering 162.6 hectares', 'Originally dedicated to the Hindu god Vishnu; gradually transformed into a Buddhist temple', 'Features five towers representing the five peaks of Mount Meru, the cosmic mountain of Hindu cosmology', 'Appears on the Cambodian national flag — the only country to feature a building on its flag'] },
    { secret: 'Statue of Liberty', hint: 'A gift from France standing in New York Harbour', facts: ['A massive copper statue on Liberty Island in New York Harbour, gifted by France to the USA', 'Officially called "Liberty Enlightening the World"; designed by Frédéric Auguste Bartholdi; internal structure by Gustave Eiffel', 'Dedicated on 28 October 1886; the copper has since oxidised to its distinctive green patina', 'The tablet she holds reads "July IV MDCCLXXVI" — the date of the US Declaration of Independence', 'For millions of immigrants arriving by sea in the early 20th century, she was the first sight of America'] },
    { secret: 'Big Ben', hint: 'The iconic clock tower of the UK Parliament', facts: ['The popular name for the Great Bell of the clock at the north end of the Palace of Westminster, London', 'Technically "Big Ben" is the bell; the tower was renamed the Elizabeth Tower in 2012 for the Queen\'s Diamond Jubilee', 'The tower stands 96 metres tall; the clock faces are 7 metres in diameter', 'First rang on 31 May 1859; famous for its deep E-note bong that opens BBC radio broadcasts', 'The tower leans approximately 0.26 degrees to the north-west — slightly, like the Tower of Pisa'] },
    { secret: 'Sydney Opera House', hint: 'An iconic sail-shaped arts venue in an Australian harbour', facts: ['A multi-venue performing arts centre in Sydney Harbour, Australia, opened in 1973', 'Designed by Danish architect Jørn Utzon, whose distinctive shell-shaped roofs are covered by over 1 million tiles', 'Construction took 14 years and cost $102 million — 14 times the original budget; Utzon resigned midway and never returned', 'Declared a UNESCO World Heritage Site in 2007 — one of the fastest buildings to receive this status', 'Hosts over 1,500 performances per year attended by approximately 1.2 million people'] },
    { secret: 'Burj Khalifa', hint: 'The world\'s tallest building, in Dubai', facts: ['The world\'s tallest building, standing 828 metres above Dubai, UAE; opened on 4 January 2010', 'Named after UAE President Sheikh Khalifa bin Zayed Al Nahyan, who provided emergency funds during Dubai\'s debt crisis', 'Has 163 habitable floors; the highest public observation deck is on the 148th floor', 'Construction began in 2004; at its peak, 12,000 workers were on site daily', 'Designed by Skidmore, Owings & Merrill; its form was inspired by the Hymenocallis desert flower'] },
    { secret: 'Mount Rushmore', hint: 'Four US presidents carved into a South Dakota mountain', facts: ['A sculpture carved into the granite face of Mount Rushmore in South Dakota, USA', 'Depicts the faces of four US presidents: Washington, Jefferson, Theodore Roosevelt, and Lincoln', 'Carved between 1927 and 1941 under sculptor Gutzon Borglum; each face is approximately 18 metres tall', 'Over 800 million pounds of rock were removed during construction', 'The Black Hills are sacred to the Lakota Sioux, who consider the carving a desecration of their land'] },
    { secret: 'Grand Canyon', hint: 'A mile-deep gorge carved by the Colorado River', facts: ['Carved by the Colorado River in Arizona, USA; 446 km long, up to 29 km wide and over 1,800 metres deep', 'Displays nearly 2 billion years of Earth\'s geological history in its rock layers', 'Designated a UNESCO World Heritage Site in 1979; receives nearly 6 million visitors per year', 'The Havasupai, Navajo, Hopi and other Indigenous peoples have lived there for thousands of years', 'President Theodore Roosevelt said: "Leave it as it is. Man cannot improve on it"'] },
    { secret: 'Niagara Falls', hint: 'Famous waterfalls on the US-Canada border', facts: ['A group of three waterfalls on the border between Ontario, Canada and New York State, USA', 'The largest — Horseshoe Falls — is 57 metres tall and 790 metres wide', 'About 168,000 cubic metres of water flow over the falls every minute at peak daytime flow', 'At least 15 people have gone over the falls in barrels or containers — some survived', 'Known as a honeymoon capital; a destination for newlyweds since at least the early 19th century'] },
    { secret: 'Angel Falls', hint: 'The world\'s highest uninterrupted waterfall, in Venezuela', facts: ['The world\'s highest uninterrupted waterfall, located in Venezuela\'s Canaima National Park', 'Drops 979 metres — nearly 20 times the height of Niagara Falls', 'Named after American aviator Jimmie Angel, who flew over it in 1933', 'Known locally as Kerepakupai Merú — "waterfall of the deepest place" — by the Pemón indigenous people', 'The water turns to mist before reaching the base, creating a perpetual rainbow in sunshine'] },
    { secret: 'The Amazon Rainforest', hint: 'The world\'s largest tropical rainforest', facts: ['The world\'s largest tropical rainforest, covering 5.5 million km² across 9 South American countries', 'Home to approximately 10% of all species on Earth — extraordinary biodiversity', 'The Amazon River carries about 20% of all freshwater discharged by rivers globally into the ocean', 'Often called the "lungs of the Earth" for its role in absorbing carbon dioxide', 'An estimated 17% of the original forest has been lost since the 1970s due to deforestation'] },
    { secret: 'Great Barrier Reef', hint: 'The world\'s largest coral reef system, off Australia', facts: ['The world\'s largest coral reef system, stretching 2,300 km along Australia\'s northeast coast', 'Composed of over 2,900 individual reefs and 900 islands; visible from outer space', 'Home to 1,500 species of fish, 4,000 types of mollusc and 6 species of sea turtles', 'Listed as a UNESCO World Heritage Site in 1981; severely threatened by coral bleaching due to rising ocean temperatures', 'Bleaching events in 2016–17 and 2020 killed approximately 50% of the reef\'s corals'] },
    { secret: 'Mariana Trench', hint: 'The deepest known point in the world\'s oceans', facts: ['The deepest oceanic trench on Earth, in the western Pacific Ocean; maximum depth of 11,034 metres (Challenger Deep)', 'At its deepest, pressure is over 1,000 times standard atmospheric pressure at sea level', 'First reached on 23 January 1960 by Jacques Piccard and Don Walsh in the bathyscaphe Trieste', 'Director James Cameron made a solo dive to the deepest point in 2012 in a specially built submersible', 'Despite extreme conditions, microorganisms, crustaceans, sea cucumbers and fish have been found there'] },
    { secret: 'Victoria Falls', hint: '"The Smoke That Thunders" — on the Zambia-Zimbabwe border', facts: ['On the border of Zambia and Zimbabwe in Africa; one of the world\'s largest and most spectacular waterfalls', 'The Zambezi River plunges 108 metres into a gorge 1,708 metres wide', 'Local Kololo name is "Mosi-oa-Tunya" — "The Smoke That Thunders" — reflecting mist visible from 50 km away', 'Scottish explorer David Livingstone became the first European to see them in November 1855, naming them after Queen Victoria', 'A UNESCO World Heritage Site; the spray creates a permanent rainforest on the opposite bank'] },
    { secret: 'Sahara Desert', hint: 'The world\'s largest hot desert', facts: ['The world\'s largest hot desert, covering approximately 9.2 million km² across northern Africa', 'Spans 11 countries including Algeria, Chad, Egypt, Libya, Mali, Morocco and Sudan', 'Only about 25% is sand dunes — the rest is rocky plateaus, gravel plains and mountains', 'Temperatures can exceed 50°C by day and drop below freezing at night', 'Was a green, fertile savanna around 10,000 years ago — cave paintings show hippos, giraffes and crocodiles'] },
    { secret: 'The Dead Sea', hint: 'The lowest point on Earth\'s surface where you float effortlessly', facts: ['A salt lake bordered by Jordan, Israel and the West Bank; its surface is 430 metres below sea level — the lowest point on Earth\'s land surface', 'About 34% salinity — 10 times saltier than the ocean — making humans effortlessly float', 'Almost no life can survive in its waters — hence the name "Dead Sea"', 'The shores are rich in minerals and black mud used for cosmetic and therapeutic purposes', 'According to the Bible, may be near the sites of the ancient cities of Sodom and Gomorrah'] },
    { secret: 'The Kaaba', hint: 'The cube-shaped structure at the centre of Islam\'s holiest mosque in Mecca', facts: ['The cube-shaped stone structure at the centre of the Masjid al-Haram mosque in Mecca, Saudi Arabia', 'The most sacred site in Islam; the qibla (direction) Muslims worldwide face in prayer', 'In Islamic tradition, originally built by Prophet Ibrahim (Abraham) and his son Ismail', 'During Hajj, millions of Muslims circle the Kaaba seven times counterclockwise (Tawaf)', 'Draped in a black cloth called the Kiswah, embroidered with Quranic verses in gold thread'] },
    { secret: 'Masjid-e-Nabvi (Prophet\'s Mosque)', hint: 'The second holiest mosque in Islam, in Medina', facts: ['Located in Medina, Saudi Arabia; the second holiest site in Islam after the Kaaba in Mecca', 'Originally built by the Prophet Muhammad (PBUH) himself in 622 CE upon his migration to Medina', 'The Prophet (PBUH) is buried beneath the mosque\'s iconic green dome — a site of profound reverence', 'The mosque has been expanded many times; it can now accommodate over 1 million worshippers simultaneously', 'Millions of Hajj and Umrah pilgrims visit each year to pray and pay their respects at the Prophet\'s tomb'] },
    { secret: 'Vatican City', hint: 'The world\'s smallest independent state, home of the Pope', facts: ['The world\'s smallest independent state by area (0.44 km²) and population, an enclave within Rome, Italy', 'Headquarters of the Roman Catholic Church and the residence of the Pope', 'Home to St Peter\'s Basilica, the Sistine Chapel (with Michelangelo\'s ceiling), and the Vatican Museums', 'Michelangelo spent four years (1508–12) painting the Sistine Chapel ceiling, working mostly on his back', 'Became an independent state through the Lateran Treaty signed with Italy in 1929'] },
    { secret: 'Notre-Dame Cathedral', hint: 'The Gothic Paris cathedral damaged by fire in 2019', facts: ['A medieval Catholic cathedral on the Île de la Cité in Paris; construction began in 1163', 'A masterpiece of French Gothic architecture — its flying buttresses, rose windows and gargoyles are iconic', 'Victor Hugo\'s The Hunchback of Notre-Dame (1831) significantly raised public awareness of the cathedral', 'A devastating fire on 15 April 2019 destroyed its spire and much of its roof; reconstruction is underway', 'Attracted about 12 million visitors a year before the fire — one of the world\'s most visited monuments'] },
    { secret: 'Golden Temple (Harmandir Sahib)', hint: 'The holiest shrine in Sikhism, in Amritsar', facts: ['The holiest Gurdwara and most important Sikh pilgrimage site, in Amritsar, India', 'Also known as Harmandir Sahib ("Abode of God"); constructed in the late 16th century under Guru Arjan Dev Ji', 'Surrounded by the sacred Amrit Sarovar (Pool of Nectar), from which Amritsar takes its name', 'Covered in gold leaf in the early 19th century by Maharaja Ranjit Singh — hence "Golden Temple"', 'In June 1984, Indian Army troops stormed the complex in Operation Blue Star to remove Sikh separatists — a deeply controversial event'] },
    { secret: 'Mount Sinai', hint: 'The mountain where Moses received the Ten Commandments', facts: ['A mountain in Egypt\'s Sinai Peninsula believed to be where God revealed the Ten Commandments to Moses', 'Known in Arabic as Jabal Musa ("Mountain of Moses"); stands 2,285 metres tall', 'Both the Bible and Islamic tradition associate this mountain with Moses\'s encounter with God', 'Thousands of pilgrims climb the mountain each night to reach the summit at dawn for a sunrise', 'Saint Catherine\'s Monastery at its base (built 6th century) is one of the world\'s oldest Christian monasteries'] },
    { secret: 'The White House', hint: 'Official home and workplace of every US President since 1800', facts: ['The official residence and workplace of the President of the United States, at 1600 Pennsylvania Avenue, Washington DC', 'Construction began in 1792; President John Adams was the first to live there in November 1800', 'Burned by British troops during the War of 1812; rebuilt and the scorched exterior was painted white — giving it its name', 'Contains 132 rooms, 35 bathrooms, a tennis court, bowling alley, cinema and swimming pool', 'Every US president except George Washington (who commissioned it) has lived there'] },
    { secret: 'Buckingham Palace', hint: 'The official London residence of the British monarch', facts: ['The official London residence of the British monarch since 1837', 'Originally built in 1703 as Buckingham House for the Duke of Buckingham; taken over by the Royal Family in 1761', 'Contains 775 rooms including 52 royal and guest bedrooms, 78 bathrooms and 19 state rooms', 'The "Changing of the Guard" ceremony takes place in the forecourt', 'During WWII it was bombed nine times; King George VI and Queen Elizabeth refused to evacuate London'] },
    { secret: 'Palace of Versailles', hint: 'The magnificent palace of French kings outside Paris', facts: ['A magnificent royal palace 20 km southwest of Paris; the seat of French royal power from 1682 to 1789', 'Built mainly by Louis XIV (the "Sun King") who moved the court there to assert total royal control', 'The Hall of Mirrors — a 73-metre gallery with 357 mirrors — is its most famous room', 'The Treaty of Versailles (1919) ending WWI was signed here; German unification was proclaimed here in 1871', 'Gardens cover 800 hectares and include 50 fountains fed by a vast system of canals'] },
    { secret: 'Topkapi Palace Museum', hint: 'The grand Ottoman palace in Istanbul housing Islamic relics', facts: ['The Ottoman imperial palace in Istanbul, Turkey; seat of the Ottoman Empire from 1465 to 1856', 'Houses extraordinary Islamic relics including the mantle of Prophet Muhammad (PBUH), his sword and seal', 'Contains four main courtyards, a harem with over 400 rooms, and a treasury with famous jewels', 'Converted into a museum in 1924 after the Ottoman Empire\'s abolition; attracts over 3 million visitors a year', 'Overlooks the Bosphorus Strait where Europe meets Asia — one of the world\'s most dramatic palace locations'] },
    { secret: 'The Louvre Museum', hint: 'The world\'s most visited art museum, home of the Mona Lisa', facts: ['The world\'s largest art museum, in central Paris in a historic palace beside the River Seine', 'Originally a medieval fortress; opened as a public museum in 1793 during the French Revolution', 'Holds approximately 380,000 objects; about 35,000 are on display including the Mona Lisa, Venus de Milo and Winged Victory', 'The iconic glass pyramid entrance was designed by Chinese-American architect I.M. Pei, added in 1989', 'Receives approximately 9 million visitors per year — the most visited art museum in the world'] },
    { secret: 'The British Museum', hint: 'London\'s vast museum holding 8 million objects from world history', facts: ['One of the world\'s largest and most comprehensive museums, in Bloomsbury, London; founded in 1753', 'Houses approximately 8 million objects spanning 2 million years of human history', 'Holds the Rosetta Stone, the Elgin Marbles (Parthenon sculptures), Egyptian mummies and the Sutton Hoo helmet', 'Free to enter; attracts approximately 6 million visitors per year', 'Many nations including Greece, Egypt and Nigeria demand the return of artefacts held there'] },
    { secret: 'Forbidden City (Beijing)', hint: 'China\'s vast imperial palace complex at the heart of Beijing', facts: ['A vast imperial palace complex in central Beijing; home of Chinese emperors from 1420 to 1912', 'Built between 1406 and 1420 under Ming Emperor Yongle; took 14 years and nearly 1 million workers', 'Comprises 980 buildings with approximately 9,000 rooms across 72 hectares', 'Surrounded by a 52-metre-wide moat and 10-metre-high walls with a tower at each corner', 'Now the Palace Museum; the largest collection of preserved ancient wooden structures in the world'] },
    { secret: 'The Kremlin (Moscow)', hint: 'Russia\'s iconic fortress at the heart of Moscow', facts: ['A fortified complex at the heart of Moscow; the official residence of the President of Russia', '"Kremlin" simply means "fortress" in Russian; many Russian cities have one, but Moscow\'s is the most famous', 'Contains the Grand Kremlin Palace, several cathedrals, and the Russian President\'s ceremonial residence', 'The red brick walls date largely to the late 15th century, built by Italian architects under Ivan III', 'Adjacent Red Square is home to St Basil\'s Cathedral (built 1555–61) and Lenin\'s Mausoleum'] },
    { secret: 'Cappadocia', hint: 'A Turkish region famous for fairy chimneys and hot-air balloons', facts: ['A historical region in central Anatolia, Turkey, famous for extraordinary "fairy chimney" rock formations', 'Volcanic eruptions created distinctive tufa rock later eroded into mushroom-like pillars by wind and water', 'Ancient inhabitants carved elaborate underground cities up to 85 metres deep for refuge from invaders', 'Famous for its hot-air balloon festivals — hundreds of balloons rise over the landscape at dawn daily', 'Early Christian communities carved hundreds of cave churches with stunning Byzantine frescoes still visible today'] },
    { secret: 'Faisal Mosque (Islamabad)', hint: 'Pakistan\'s national mosque shaped like a Bedouin tent', facts: ['The national mosque of Pakistan, in the Margalla Hills foothills at the edge of Islamabad', 'The largest mosque in South Asia and one of the largest in the world, with capacity for 100,000 worshippers', 'Designed by Turkish architect Vedat Dalokay — its striking modern design resembles a giant Bedouin tent with eight concrete fins', 'Funded largely by Saudi Arabia and named after King Faisal, who donated the funds and laid the foundation stone', 'Construction ran from 1976 to 1986; it has become an iconic symbol of Islamabad and Pakistan'] },
    { secret: 'Lahore Fort (Shahi Qila)', hint: 'A magnificent Mughal fortress in the heart of Lahore', facts: ['A massive fortified palace complex in the heart of Lahore, Pakistan; a UNESCO World Heritage Site', 'Construction began under Mughal Emperor Akbar in the late 16th century; expanded by Jahangir and Shah Jahan', 'Contains 21 notable monuments including the Sheesh Mahal (Palace of Mirrors) — covered in thousands of mirror pieces', 'Moti Masjid (Pearl Mosque) within the fort is one of the most beautiful small mosques in South Asia', 'Has witnessed over 1,000 years of South Asian history; occupied and altered during Sikh and British colonial eras'] },
    { secret: 'Uluru (Ayers Rock)', hint: 'A massive sacred sandstone monolith in the Australian outback', facts: ['A massive sandstone rock formation in Australia\'s Northern Territory; 348 metres high and 9.4 km around', 'Sacred to the Anangu people — the traditional custodians — who have lived around it for over 22,000 years', 'Known to the Anangu as Uluru; named Ayers Rock by European explorer William Gosse in 1873 after the South Australian Premier', 'Changes colour dramatically with the light — from deep ochre at midday to vivid orange and crimson at sunrise and sunset', 'Climbing Uluru was banned permanently in 2019 out of respect for Anangu cultural beliefs; about 400,000 people visit each year'] },
    { secret: 'Galápagos Islands', hint: 'The remote Pacific islands whose wildlife inspired Darwin\'s theory of evolution', facts: ['An archipelago of volcanic islands 906 km off the coast of Ecuador in the Pacific Ocean', 'Famous for their extraordinary biodiversity — giant tortoises, marine iguanas, flightless cormorants and Darwin\'s finches found nowhere else on Earth', 'Charles Darwin visited in 1835 aboard HMS Beagle; observations of finch beak variations across islands were key to his theory of evolution by natural selection', 'Listed as a UNESCO World Heritage Site in 1978 — among the first in the world', 'About 97% of the islands\' land area is a protected national park; the unique ecosystem is threatened by tourism and invasive species'] },
    { secret: 'Leaning Tower of Pisa', hint: 'The famous tilting medieval bell tower in Italy', facts: ['A freestanding bell tower in Pisa, Italy, famous for its unintended four-degree tilt', 'Construction began in 1173 and took nearly 200 years — the soft soil on one side began to sink during construction', 'Stands 56 metres tall on the low side and 57 metres on the high side; made from white and grey marble', 'Galileo Galilei reportedly used the tower to demonstrate that objects of different masses fall at the same speed — though historians debate this', 'Between 1990 and 2001, engineers straightened the tilt by 38 cm to stabilise it; it is now safe for at least 200 more years'] },
    { secret: 'Tower of London', hint: 'The ancient fortress where princes were imprisoned and heads were lost', facts: ['A historic castle on the north bank of the Thames in central London, built by William the Conqueror from 1066', 'Has served as a royal palace, fortress, prison, execution site, armoury, treasury, menagerie and home of the Crown Jewels', 'Famous prisoners include Anne Boleyn, Thomas More, Guy Fawkes and Rudolf Hess; two young princes (Edward V and brother) vanished there mysteriously in 1483', 'Home to the Crown Jewels, displayed in the Jewel House; Yeoman Warders (Beefeaters) guard it in distinctive Tudor uniforms', 'Ravens have been kept at the Tower since at least the 17th century; legend says if they leave, the Crown and Tower will fall'] },
    { secret: 'Hagia Sophia', hint: 'Istanbul\'s magnificent domed cathedral that became a mosque, then a museum, then a mosque again', facts: ['A grand architectural masterpiece in Istanbul, Turkey; originally built as a Christian cathedral by Byzantine Emperor Justinian I in 537 AD', 'Its enormous dome — 31 metres in diameter — was an engineering marvel and remained the world\'s largest for nearly a millennium', 'Converted to a mosque after Mehmed II captured Constantinople in 1453; minarets were added to the exterior', 'Converted to a museum by Turkish President Atatürk in 1934 as a secular gesture; re-converted to an active mosque in 2020', 'A UNESCO World Heritage Site and one of the world\'s greatest architectural achievements, influencing building design for 1,500 years'] },
    { secret: 'Pompeii', hint: 'The Roman city buried — and preserved — by a volcanic eruption in 79 AD', facts: ['An ancient Roman city near Naples, Italy, buried under 4–6 metres of volcanic ash and pumice when Mount Vesuvius erupted on 24 August 79 AD', 'The eruption killed an estimated 2,000 people — many suffocated by the toxic pyroclastic surge rather than buried by ash', 'The volcanic ash preserved the city in remarkable detail — buildings, mosaics, frescoes, food and even the bodies of victims', 'Systematic excavation began in 1748; archaeologists pour plaster into cavities in the ash to cast the shapes of those who died', 'Over 2.5 million visitors per year make Pompeii one of Italy\'s most visited sites; excavation and conservation continue today'] },
    { secret: 'Easter Island (Rapa Nui)', hint: 'A remote Pacific island covered in giant stone statues called moai', facts: ['A Chilean island in the south-eastern Pacific Ocean, 3,700 km from the Chilean coast — one of the world\'s most remote inhabited islands', 'Famous for its 900 moai — giant stone statues carved by the Rapa Nui people between roughly 1250 and 1500 AD', 'The average moai is about 4 metres tall and weighs 12.5 tonnes; the tallest completed one is 10 metres tall', 'Carved from compressed volcanic ash at the Rano Raraku quarry; how they were moved remains debated — experiments suggest "walking" them upright', 'The island\'s population likely collapsed in the 17th–18th centuries due to over-exploitation of forests and resources — a cautionary ecological tale'] },
    { secret: 'Chichen Itza', hint: 'The ancient Mayan city in Mexico with a pyramid aligned to the equinox sun', facts: ['A large pre-Columbian archaeological site in Mexico\'s Yucatán Peninsula, built by the Mayan civilisation around 600–1200 AD', 'The Temple of Kukulcan (El Castillo) is its centrepiece — a step pyramid with 365 steps, one for each day of the year', 'At the spring and autumn equinoxes, shadows create a serpent illusion that appears to slither down the pyramid — a spectacular effect drawing thousands annually', 'One of the New Seven Wonders of the World; a UNESCO World Heritage Site', 'Chichen Itza means "At the mouth of the well of the Itza"; a sacred cenote (natural sinkhole) was used for ritual offerings'] },
    { secret: 'Auschwitz-Birkenau', hint: 'The largest Nazi concentration and extermination camp, in occupied Poland', facts: ['The largest complex of Nazi concentration and extermination camps, located in Oświęcim (German: Auschwitz) in occupied Poland', 'Established in 1940 as a camp for Polish political prisoners; expanded from 1942 into an extermination complex', 'Between 1.1 and 1.5 million people were killed there — 90% of them Jewish — by gas chambers, shooting, starvation and disease', 'Survivors were liberated by Soviet forces on 27 January 1945; that date is now International Holocaust Remembrance Day', 'Preserved as a UNESCO World Heritage Site and major memorial museum; visited by over 2 million people a year as a place of remembrance and education'] },
    { secret: 'Table Mountain', hint: 'The flat-topped mountain overlooking Cape Town, South Africa', facts: ['A flat-topped mountain forming a dramatic backdrop to Cape Town, South Africa; one of the world\'s most iconic landmarks', 'Stands 1,086 metres above sea level; the flat top is approximately 3 km wide and frequently covered by a cloud "tablecloth"', 'One of the New Seven Wonders of Nature (voted 2011); a UNESCO World Heritage Site as part of the Cape Floristic Region', 'Estimated to be around 600 million years old — one of Earth\'s oldest mountains', 'A cable car runs to the summit; over 800 species of plants are found on the mountain, many found nowhere else on Earth'] },
    { secret: 'Sagrada Família', hint: 'Antoni Gaudí\'s unfinished basilica in Barcelona, still under construction after 140 years', facts: ['A large Roman Catholic minor basilica in Barcelona, Spain; under construction since 1882 and still unfinished', 'Designed by Catalan architect Antoni Gaudí from 1883 until his death; characterised by its extraordinary organic, tree-like stone columns and stained glass', 'Gaudí died in 1926 — struck by a tram — with the church about 15–25% complete; he is buried in its crypt', 'A UNESCO World Heritage Site; the most-visited monument in Spain with nearly 5 million visitors per year', 'Completion is projected around 2026 — coinciding with the centenary of Gaudí\'s death — after over 140 years of construction'] },
    { secret: 'Neuschwanstein Castle', hint: 'The fairy-tale Bavarian castle that inspired Disney\'s Sleeping Beauty castle', facts: ['A 19th-century Romanesque Revival palace in the Bavarian Alps of Germany, commissioned by King Ludwig II of Bavaria', 'Built from 1869 as a retreat for the reclusive king, who was obsessed with the operas of Richard Wagner; rooms depict Wagnerian scenes', 'Ludwig died in 1886 under mysterious circumstances — two days after being declared unfit to rule; the castle was never completed', 'Opened to the public six weeks after Ludwig\'s death; now one of the most visited castles in Europe with 1.4 million visitors a year', 'The castle\'s silhouette directly inspired the design of Sleeping Beauty Castle at Disneyland, making it the most famous castle in popular culture'] },
    { secret: 'Times Square', hint: 'New York\'s neon-lit crossroads of the world', facts: ['A major commercial and entertainment hub in Midtown Manhattan, New York City, where Broadway meets Seventh Avenue', 'Famous for its dazzling array of digital billboards and neon signs, which give it the nickname "The Crossroads of the World"', 'Originally called Longacre Square; renamed Times Square in 1904 when The New York Times moved its headquarters nearby', 'Over 50 million people visit Times Square annually — one of the world\'s most visited tourist destinations', 'The New Year\'s Eve ball drop from the Times Square Building has been a tradition since 1907; an estimated 1 billion people watch worldwide'] },
    { secret: 'Golden Gate Bridge', hint: 'San Francisco\'s iconic red suspension bridge over the bay', facts: ['A suspension bridge spanning the Golden Gate strait — the opening of San Francisco Bay into the Pacific Ocean', 'Opened on 27 May 1937; its distinctive International Orange colour was originally a sealant primer that the chief architect adopted permanently', 'Stretches 2,737 metres between towers; its towers stand 227 metres above the water', 'Built during the Great Depression; chief engineer Joseph Strauss had initially proposed an ugly cantilever design before a more elegant concept was developed', 'One of the most photographed structures in the world; receives about 10 million visitors per year'] },
    { secret: 'Westminster Abbey', hint: 'Britain\'s royal church where monarchs are crowned and many are buried', facts: ['A Gothic abbey church in central London; since 1066, every English or British monarch except two has been crowned here', 'The current abbey dates largely to the 13th century, commissioned by Henry III; the western towers were completed in 1745', 'The burial place of 17 monarchs, as well as Charles Darwin, Isaac Newton, Geoffrey Chaucer and many other notable figures', 'Poets\' Corner — a section in the south transept — contains memorials and graves of great writers, composers and actors', 'The Royal Wedding of Prince William and Catherine Middleton was held here in April 2011, watched by 2 billion people worldwide'] },
    { secret: 'Empire State Building', hint: 'New York\'s iconic Art Deco skyscraper, once the world\'s tallest', facts: ['A 102-storey Art Deco skyscraper in Midtown Manhattan, New York City; opened on 1 May 1931', 'Stands 443 metres to roof (or 443m to the roof, 443m to roof); including its antenna, 443m tall — was the world\'s tallest building from 1931 to 1970', 'Built during the Great Depression in just 410 days — construction was so fast workers finished ahead of schedule', 'Has appeared in over 250 films; most famously King Kong (1933), in which a giant ape climbs to its summit', 'Over 4 million visitors per year take its elevators to the observation decks on the 86th and 102nd floors'] },
    { secret: 'Mount Fuji', hint: 'Japan\'s sacred snow-capped volcano and most recognisable natural landmark', facts: ['An active stratovolcano and Japan\'s highest mountain at 3,776 metres, on Honshu island', 'The last eruption was in 1707–08 (the Hōei eruption) which deposited ash on Edo (Tokyo); it is currently dormant but not extinct', 'Has been climbed and revered since at least the 7th century AD; considered a sacred mountain by Shintoists and Buddhists', 'About 300,000 people climb it each year, mainly in July and August; traditionally climbers aim to reach the summit at sunrise', 'A UNESCO World Heritage Site (inscribed 2013) for its cultural significance; it has inspired countless Japanese artworks, most famously Hokusai\'s The Great Wave'] },
    { secret: 'Mount Kilimanjaro', hint: 'Africa\'s highest peak and the world\'s tallest freestanding mountain', facts: ['A dormant stratovolcano in Tanzania, Africa; at 5,895 metres it is Africa\'s highest peak and the world\'s highest freestanding mountain', 'Composed of three volcanic cones: Kibo (the highest), Mawenzi and Shira', 'First reached its summit by European climbers Hans Meyer and Ludwig Purtscheller on 6 October 1889', 'Known for the bizarre "moving" zone — climbers pass through five distinct climate zones, from tropical rainforest to arctic summit, in a single ascent', 'Its glaciers are retreating rapidly due to climate change; scientists predict the summit ice fields may vanish entirely by 2040'] },
    { secret: 'Iguazu Falls', hint: 'Spectacular waterfalls on the Argentina-Brazil border wider than Niagara', facts: ['A system of 275 waterfalls on the border of Argentina and Brazil — one of the world\'s most spectacular natural wonders', 'Stretches approximately 2.7 km wide, making it nearly twice as wide as Niagara Falls; the tallest falls drop 82 metres', 'Named from the Guaraní words "y" (water) and "ûasú" (big) — literally "Big Water"', 'Surrounded by lush subtropical jungle; unique wildlife including toucans, coatis, jaguars and giant anteaters', 'A UNESCO World Heritage Site on both the Argentine and Brazilian sides; about 1.5 million tourists visit annually'] },
    { secret: 'Yellowstone National Park', hint: 'The USA\'s first national park, sitting atop a massive supervolcano', facts: ['Established on 1 March 1872 — the world\'s first national park; located primarily in Wyoming, USA', 'Sits atop one of the world\'s largest volcanic hotspots, the Yellowstone Caldera — a supervolcano with a last major eruption 640,000 years ago', 'Home to over half the world\'s geysers, including Old Faithful — which erupts approximately every 90 minutes', 'Has the world\'s largest concentration of geothermal features: more than 10,000 thermal features including hot springs, fumaroles and mud pots', 'Home to large populations of grizzly bears, wolves, bison and elk; the 1995 reintroduction of wolves dramatically restored the park\'s ecosystem'] },
    { secret: 'Borobudur', hint: 'The world\'s largest Buddhist temple, in Indonesia', facts: ['The world\'s largest Buddhist temple, located in Central Java, Indonesia; built in the 9th century during the Sailendra dynasty', 'A massive stepped pyramid structure with six square terraces topped by three circular platforms, adorned with 2,672 relief panels and 504 Buddha statues', 'Abandoned and covered by volcanic ash and jungle after the decline of Buddhism in Java around the 14th century; rediscovered by the Dutch in 1814', 'A UNESCO World Heritage Site; restoration was completed in 1983 with UNESCO support', 'About 2.5 million visitors come each year, with Buddhists making pilgrimages to circumambulate the structure in the direction of the Sun'] },
    { secret: 'The Serengeti', hint: 'Africa\'s most famous ecosystem, home to the great wildebeest migration', facts: ['A vast ecosystem of approximately 30,000 km² in Tanzania and Kenya, East Africa — one of the Seven Natural Wonders of Africa', 'Home to the world\'s largest land animal migration: over 1.5 million wildebeest, 500,000 zebra and 200,000 gazelle moving in a circular route', 'Supports the largest lion population in Africa, as well as leopards, cheetahs, elephants, giraffes and hippos', 'Serengeti National Park (Tanzania) was declared a UNESCO World Heritage Site in 1981', 'The Maasai Mara in Kenya (the migration\'s northern extension) is famous for dramatic river crossings where wildebeest brave crocodiles'] },
    { secret: 'Alhambra Palace', hint: 'Spain\'s extraordinary Moorish palace and fortress in Granada', facts: ['A stunning palace and fortress complex in Granada, Spain, built by the Moorish rulers of the Emirate of Granada in the 13th and 14th centuries', 'The name comes from the Arabic "al-Qal\'a al-Hamra" meaning "the Red Fortress," after its red-clay building materials', 'Famous for its intricate Islamic geometric tilework, carved stucco arches, wooden ceilings and reflecting pools', 'The Nasrid Palaces within the complex are considered among the finest examples of Islamic architecture in the world', 'Remained Moorish until 1492 when the last Muslim sultan Boabdil surrendered to Ferdinand and Isabella; according to legend he wept as he looked back, to which his mother said "You weep like a woman for what you could not defend as a man"'] },
    { secret: 'Suez Canal', hint: 'The waterway that connects the Mediterranean to the Red Sea', facts: ['An artificial canal in Egypt, 193 km long, connecting the Mediterranean Sea to the Red Sea — opened on 17 November 1869', 'Built under the direction of French diplomat Ferdinand de Lesseps; took ten years and an estimated 1.5 million labourers to construct', 'Eliminated the need to sail around Africa\'s Cape of Good Hope, cutting the sea voyage from London to Mumbai by over 7,000 km', 'Egypt nationalised the canal in 1956 under President Nasser, triggering the Suez Crisis — a confrontation with Britain, France and Israel that ended in a humiliating Western withdrawal', 'In March 2021 the container ship Ever Given ran aground and blocked the canal for six days, disrupting global trade worth an estimated $9.6 billion per day'] },
    { secret: 'Dolmabahçe Palace', hint: 'The opulent 19th-century Ottoman palace on the shores of the Bosphorus', facts: ['A grand Ottoman imperial palace on the European shore of the Bosphorus strait in Istanbul, Turkey; completed in 1856', 'Built by Sultan Abdülmecid I to replace the older Topkapı Palace as the main administrative centre of the Ottoman Empire', 'The largest palace in Turkey: 45,000 square metres, 285 rooms, 43 halls, 6 hammams and 68 toilets; its crystal staircase and 4.5-tonne Bohemian chandelier are its most famous features', 'Mustafa Kemal Atatürk, founder of modern Turkey, used the palace as his Istanbul residence and died there on 10 November 1938', 'All the clocks in the palace are stopped at 9:05 AM — the exact moment of Atatürk\'s death — as a permanent memorial'] },
    { secret: '10 Downing Street', hint: 'The official residence of the British Prime Minister in London', facts: ['A townhouse at 10 Downing Street, Westminster, London — the official residence and office of the Prime Minister of the United Kingdom since 1735', 'The building is far larger than its modest facade suggests: it connects to a sprawling complex of offices behind, with over 100 rooms', 'The famous black front door is so heavy it can only be opened from the inside; the door knocker is a replica — the original lion\'s head was replaced for security reasons', 'It has been home to every British Prime Minister since Robert Walpole, the first holder of the office; Winston Churchill famously worked from the Cabinet War Rooms nearby during WWII', 'The address is so synonymous with British power that "Downing Street" is used as a shorthand for the Prime Minister\'s office, just as "the White House" is for the US presidency'] },
    { secret: 'Élysée Palace', hint: 'The official residence of the President of France in Paris', facts: ['A neoclassical palace at 55 Rue du Faubourg Saint-Honoré in Paris — the official residence and workplace of the President of the French Republic since 1848', 'Built in 1722 for the Count of Évreux; later owned by Madame de Pompadour, mistress of Louis XV, and used by Napoleon Bonaparte, who signed his second abdication there in 1815', 'Covers about 11,000 square metres with 365 rooms; its gardens extend over 2 hectares in the heart of Paris', 'The Palace is heavily guarded and closed to the public; it is one of the most secure buildings in France', '"Élysée" is used as a byword for the French presidency — French media say "the Élysée said today" just as the British say "Downing Street"'] },
    { secret: 'The Western Wall', hint: 'The holiest site in Judaism, a remnant of the ancient Temple in Jerusalem', facts: ['A limestone retaining wall in the Old City of Jerusalem, approximately 488 metres long; the holiest place where Jews are permitted to pray', 'It is the last surviving remnant of the Second Temple complex — the sacred centre of ancient Jewish life — destroyed by the Romans in 70 AD', 'Also known as the Wailing Wall; Jews have prayed and mourned the Temple\'s destruction there for nearly 2,000 years', 'Millions of visitors insert written prayers (kvitlach) into the cracks between the ancient stones each year', 'Israel captured East Jerusalem, including the Western Wall, in the Six-Day War of 1967; the plaza in front was cleared to create a large prayer space'] },
    { secret: 'Church of the Holy Sepulchre', hint: 'The church in Jerusalem built over the site of Christ\'s crucifixion and resurrection', facts: ['A church in the Christian Quarter of the Old City of Jerusalem, built over the site traditionally identified as Golgotha — where Jesus was crucified — and his nearby tomb', 'First built by Emperor Constantine I in 335 AD; it has been destroyed, rebuilt and expanded multiple times over the centuries', 'The most sacred Christian site in the world; visited by millions of pilgrims annually from Catholic, Eastern Orthodox, Armenian, Coptic, Ethiopian and Syriac traditions', 'The church is administered jointly by six Christian denominations who have strictly defined rights in each area — disputes over those rights have sometimes turned physical', 'A large iron key to the church\'s main entrance has been held by the Muslim Joudeh family since the time of Saladin in the 12th century, with a second Muslim family — the Nuseibeh — serving as doorkeepers'] },
    { secret: 'Blue Mosque (Sultan Ahmed Mosque)', hint: 'Istanbul\'s iconic mosque with six minarets and cascading domes', facts: ['A historic imperial mosque in Istanbul, Turkey — officially the Sultan Ahmed Mosque, built between 1609 and 1616 during the reign of Sultan Ahmed I', 'Famous for its six minarets — controversially the same number as the mosque in Mecca at the time — and its interior decorated with over 20,000 hand-painted blue Iznik tiles, giving it the popular name "the Blue Mosque"', 'The mosque faces the Hagia Sophia across the Sultanahmet Square; both are among the most visited sites in Turkey', 'Its exterior features five main domes, six minarets and eight secondary domes in a cascading silhouette that dominates Istanbul\'s skyline', 'Unlike many historical mosques, it remains an active place of worship; non-Muslim visitors are welcome outside prayer times and required to dress modestly and remove their shoes'] },
    { secret: 'Indus Valley (Mohenjo-daro)', hint: 'The ruins of one of humanity\'s earliest and most advanced ancient civilisations', facts: ['Mohenjo-daro is the best-preserved city of the Indus Valley Civilisation — one of the world\'s three earliest urban civilisations, flourishing around 2500–1900 BC in what is now Pakistan', 'Located in Sindh, Pakistan, on the right bank of the Indus River; the name means "Mound of the Dead Men" in Sindhi', 'The city was extraordinarily advanced for its time: it had a grid-planned street layout, multi-storey brick buildings, a sophisticated drainage and sewage system, and a great public bath', 'At its peak it housed an estimated 35,000–40,000 people; the civilisation at its height extended over 1.25 million square kilometres — larger than ancient Egypt or Mesopotamia', 'The Indus script remains undeciphered to this day — making the Indus Valley Civilisation one of history\'s great unsolved mysteries; the ruins were designated a UNESCO World Heritage Site in 1980'] },
    { secret: 'K2', hint: 'The world\'s second-highest mountain and most dangerous peak to climb', facts: ['At 8,611 metres (28,251 ft), K2 is the world\'s second-highest mountain after Everest; it straddles the border between Pakistan\'s Gilgit-Baltistan and China\'s Xinjiang region', 'Known as the "Savage Mountain" — its death rate is far higher than Everest; roughly one climber dies for every four who reach the summit', 'First summited on 31 July 1954 by Italians Achille Compagnoni and Lino Lacedelli as part of an Italian expedition led by Ardito Desio', 'K2 has never been climbed in winter until January 2021, when a team of ten Nepali climbers made the first winter ascent — one of mountaineering\'s last great milestones', 'The name "K2" comes from the Karakoram survey notation: it was the second peak recorded during the 1856 Great Trigonometric Survey of the Karakoram range'] },
    { secret: 'Strait of Hormuz', hint: 'The narrow waterway through which a fifth of the world\'s oil passes', facts: ['A narrow strait between the Persian Gulf and the Gulf of Oman, bordered by Iran to the north and Oman and the UAE to the south; at its narrowest it is only 33 km wide', 'Approximately 20% of the world\'s total oil supply — and 35% of all seaborne oil — passes through the Strait of Hormuz, making it the world\'s most strategically important maritime chokepoint', 'Iran has repeatedly threatened to close the strait during periods of tension with the US; doing so would trigger a global energy crisis and has been called an act of war', 'The US Fifth Fleet is based in Bahrain specifically to keep the strait open; naval confrontations between US and Iranian vessels in the strait are relatively frequent', 'The strait is also vital for liquefied natural gas (LNG) exports from Qatar — the world\'s largest LNG exporter — making its security critical to energy supplies across Europe and Asia'] },
    { secret: 'Strait of Malacca', hint: 'The busiest shipping lane in the world, connecting the Indian Ocean to the Pacific', facts: ['A narrow stretch of water, approximately 800 km long, between the Malay Peninsula and the Indonesian island of Sumatra, connecting the Indian Ocean to the South China Sea and Pacific', 'The world\'s busiest shipping strait: over 100,000 vessels pass through it annually, carrying about 25% of global trade including oil from the Middle East to China, Japan and South Korea', 'At its narrowest point — the Phillips Channel near Singapore — it is only 2.7 km wide, making it one of the most congested waterways on earth', 'Singapore, at the southern tip of the strait, owes its extraordinary wealth almost entirely to its position controlling this chokepoint; it is the world\'s second-busiest port', 'Historically a hub of trade between China, India and Arabia for over 1,000 years; the Sultanate of Malacca (1400–1511) grew immensely wealthy by controlling and taxing the strait\'s trade'] },
    { secret: 'Christ the Redeemer', hint: 'The giant statue of Jesus overlooking Rio de Janeiro from a mountaintop', facts: ['A colossal Art Deco statue of Jesus Christ standing 30 metres tall (38 metres including its pedestal) atop Corcovado Mountain, 700 metres above Rio de Janeiro, Brazil', 'Constructed between 1922 and 1931; designed by Brazilian engineer Heitor da Silva Costa and sculpted by French artist Paul Landowski', 'The outstretched arms span 28 metres, symbolising peace; the statue is made of reinforced concrete clad in triangular soapstone tiles', 'Named one of the New Seven Wonders of the World in 2007; it receives over 2 million visitors a year and is the symbol of both Rio and Brazil', 'Struck by lightning multiple times; the right thumb was damaged in a 2014 storm — a recurring maintenance challenge for the 90-year-old structure'] },
    { secret: 'Disneyland (Anaheim)', hint: 'The original Magic Kingdom theme park opened by Walt Disney in California', facts: ['The original Disneyland park, opened on 17 July 1955 in Anaheim, California — the world\'s first purpose-built Disney theme park, created by Walt Disney himself', 'Walt Disney personally oversaw every detail of its design; he wanted a clean, immersive "themed" environment unlike the grimy fairgrounds of the era', 'On opening day the park was plagued by problems — a plumbers\' strike meant most drinking fountains were dry, and the asphalt on Main Street USA was so fresh that women\'s heels sank into it', 'Divided into themed "lands" — Main Street USA, Adventureland, Frontierland, Fantasyland and Tomorrowland — a structure that all subsequent Disney parks replicated', 'Disneyland has hosted US presidents, world leaders and hundreds of millions of visitors; it welcomes around 18 million guests annually and is one of the world\'s most visited tourist attractions'] },
    { secret: 'Bodh Gaya', hint: 'The sacred site in India where the Buddha attained enlightenment', facts: ['A town in Bihar, India, considered the most holy site in Buddhism — the place where Siddhartha Gautama attained enlightenment (Bodhi) under the Bodhi Tree around 528 BC', 'The Mahabodhi Temple, a UNESCO World Heritage Site, marks the exact spot; the current temple was built in the 3rd century BC by Emperor Ashoka and later rebuilt', 'The Bodhi Tree growing at the site is said to be a direct descendant of the original tree under which the Buddha meditated for 49 days before achieving enlightenment', 'Pilgrims from Buddhist communities worldwide — Sri Lanka, Thailand, Japan, Tibet, China, Myanmar — maintain temples and monasteries in Bodh Gaya', 'The site was largely forgotten and fell into Hindu and then Muslim hands for centuries before being rediscovered and restored following archaeological work in the 19th century'] },
    { secret: 'Banff National Park', hint: 'Canada\'s oldest national park, famous for its turquoise lakes and Rocky Mountain scenery', facts: ['Canada\'s first national park, established in 1885 in the Rocky Mountains of Alberta — and one of the world\'s most visited national parks', 'Famous for its vivid turquoise glacial lakes — Lake Louise and Moraine Lake — whose colour comes from rock flour (fine glacial sediment) suspended in the meltwater', 'Covers 6,641 square kilometres of mountains, glaciers, forests, meadows and rivers; home to grizzly bears, wolves, elk, mountain goats and bighorn sheep', 'The town of Banff, inside the park, is a year-round resort destination; the Trans-Canada Highway and the historic Banff Springs Hotel are iconic landmarks', 'Part of the Canadian Rocky Mountain Parks UNESCO World Heritage Site; the Columbia Icefield — one of the largest non-polar icefields in the world — lies partly within the park'] },
    { secret: 'The Himalayas', hint: 'The world\'s highest mountain range, home to Everest and a dozen other 8,000-metre peaks', facts: ['The world\'s highest and most extensive mountain range, stretching approximately 2,400 km across five countries: Pakistan, India, Nepal, Bhutan and China (Tibet)', 'Home to all 14 of the world\'s peaks above 8,000 metres — including Mount Everest (8,849 m), K2 (8,611 m), Kangchenjunga (8,586 m) and Annapurna (8,091 m)', 'Formed by the collision of the Indian and Eurasian tectonic plates beginning around 50 million years ago — and still rising by about 5 mm per year', 'The source of ten of Asia\'s major rivers — including the Ganges, Indus, Brahmaputra and Yangtze — providing freshwater to nearly 3 billion people', 'Considered sacred in Hinduism, Buddhism and other South Asian faiths; Mount Kailash in the Tibetan Himalayas is venerated as the abode of Lord Shiva and draws pilgrims from across the region'] },
    { secret: 'The Swiss Alps', hint: 'Europe\'s iconic mountain range of glaciers, ski resorts and chocolate-box villages', facts: ['The central portion of the Alps mountain range, running through Switzerland and covering about 65% of the country\'s total area', 'Home to the Matterhorn (4,478 m) — one of the most photographed mountains in the world — and the Jungfrau, Eiger and Aletsch Glacier, Europe\'s longest glacier', 'The Aletsch Glacier, 23 km long, is a UNESCO World Heritage Site; Alpine glaciers have lost about 60% of their volume since 1850 due to climate change', 'Switzerland\'s world-class ski resorts — Zermatt, Verbier, St Moritz, Davos — attract millions of winter visitors; the first Winter Olympics were held in nearby Chamonix (France) in 1924', 'The Alps have shaped Swiss identity, culture and economy for centuries; mountain passes like the St Gotthard and Simplon were vital trade routes linking northern and southern Europe'] },
    { secret: 'Patagonia', hint: 'The vast wilderness at the southern tip of South America shared by Argentina and Chile', facts: ['A sparsely populated region at the southern end of South America, shared between Argentina (east) and Chile (west), covering approximately 1 million square kilometres', 'Home to some of the world\'s most dramatic landscapes: Torres del Paine in Chile and Los Glaciares National Park in Argentina, both UNESCO World Heritage Sites', 'Contains the Southern Patagonian Ice Field — the world\'s second largest temperate ice field after Alaska — feeding enormous glaciers including the Perito Moreno, one of the few glaciers in the world still advancing', 'Named by the explorer Ferdinand Magellan in 1520 after the indigenous Tehuelche people, whom he called "Patagones" (big feet) after their large guanaco-skin moccasins', 'One of the world\'s last great wilderness regions, home to pumas, guanacos, condors, Magellanic penguins and southern right whales; sparsely inhabited with fewer than 2 million people across its vast expanse'] },
    { secret: 'Universal Studios Hollywood', hint: 'The world\'s oldest movie studio that became a theme park in Los Angeles', facts: ['Located in Universal City, Los Angeles, California — the world\'s oldest and most famous working movie studio, founded in 1912 by Carl Laemmle', 'The studio backlot tour began in 1964, evolving into one of America\'s most visited theme parks; it attracts around 9 million guests annually', 'Home to iconic attractions including the Wizarding World of Harry Potter, Jurassic World ride, Transformers, and the famous tram tour through working movie sets', 'The studio has produced some of cinema\'s greatest films — Jaws, E.T., Jurassic Park, Schindler\'s List, Back to the Future — many of whose sets can still be visited on the backlot tour', 'A working studio and a theme park simultaneously — films and TV shows are still actively produced on the lot while tourists ride attractions feet away from live productions'] },
    { secret: 'Las Vegas Strip', hint: 'The neon-lit boulevard of mega-casinos and entertainment in the Nevada desert', facts: ['A 6.7 km stretch of Las Vegas Boulevard South in Clark County, Nevada — officially outside Las Vegas city limits — lined with the world\'s largest hotel-casinos and entertainment venues', 'Home to some of the world\'s biggest hotels: the MGM Grand, Bellagio, Caesars Palace, The Venetian and Luxor; the Strip contains more than 15 of the 25 largest hotels on earth', 'The Bellagio\'s dancing fountains, the Venetian\'s indoor canals, Paris Las Vegas\'s half-scale Eiffel Tower and the Luxor\'s glass pyramid are among its most recognisable landmarks', 'Las Vegas generates over $7 billion in gaming revenue annually; the Strip alone accounts for the majority of Nevada\'s tax base', 'The city consumes extraordinary amounts of energy and water in the middle of the Mojave Desert; despite this, it has become one of the world\'s most visited tourist destinations with over 40 million visitors per year'] },
    { secret: 'Pamukkale', hint: 'Turkey\'s surreal white terraces of mineral-rich thermal pools', facts: ['A natural site in Denizli Province, southwestern Turkey — famous for its dazzling white travertine terraces filled with warm, mineral-rich turquoise thermal pools cascading down a hillside', 'The name means "Cotton Castle" in Turkish; the terraces are formed by calcium carbonate deposited over thousands of years from the 17 natural hot springs (35–100°C) that bubble up through the rock', 'Humans have bathed in its waters for at least 2,000 years; the ancient Greco-Roman city of Hierapolis was built at the top of the terraces and is now an adjoining UNESCO World Heritage Site', 'Tourism damage in the 20th century — hotels built on the terraces, visitors wearing shoes — caused significant bleaching; the site is now strictly protected, with visitors required to walk barefoot', 'The ruins of Hierapolis include a remarkably well-preserved Roman theatre seating 12,000, an extensive necropolis, and the Plutonium — a cave sacred to Pluto whose toxic fumes were long thought to have magical properties'] },
    { secret: 'Petronas Twin Towers', hint: 'The iconic twin skyscrapers that defined Kuala Lumpur\'s skyline', facts: ['Twin skyscrapers in Kuala Lumpur, Malaysia, standing 452 metres tall (88 floors) — the world\'s tallest buildings from 1998 to 2004, when they were surpassed by Taipei 101', 'Designed by Argentine-American architect César Pelli; each tower\'s floor plan is based on an eight-pointed Islamic star, reflecting Malaysia\'s Muslim heritage', 'The towers are connected at the 41st and 42nd floors by a double-decker skybridge — the highest two-storey bridge in the world at the time of construction', 'Tower 1 is headquarters of Petronas (Malaysia\'s national oil company); Tower 2 houses major multinational corporations; the podium below contains a vast shopping mall', 'Construction began in 1993 and was completed in 1998; the towers were built on what was formerly the Selangor Turf Club horse-racing track in the heart of KL\'s "Golden Triangle"'] },
    { secret: 'Karakoram Highway', hint: 'The world\'s highest paved international road, crossing the mountains between Pakistan and China', facts: ['A 1,300 km road connecting Hasan Abdal in Pakistan\'s Punjab province to Kashgar in China\'s Xinjiang region — the highest paved international highway in the world, crossing at Khunjerab Pass (4,693 m)', 'Built jointly by Pakistan and China between 1959 and 1979; an estimated 810 Pakistani and 82 Chinese workers died during construction — many from landslides, avalanches and harsh conditions', 'Passes through some of the world\'s most dramatic scenery: the Karakoram, Himalayan and Hindu Kush mountain ranges, alongside the Hunza and Gilgit rivers', 'Runs near K2, Nanga Parbat and dozens of other towering peaks; the Hunza Valley — often called one of the most beautiful places on earth — lies along its route', 'Nicknamed the "Eighth Wonder of the World"; it has transformed trade, tourism and connectivity between Central and South Asia and is a key artery of China\'s Belt and Road Initiative'] },
    { secret: 'Deosai Plains', hint: 'The world\'s second-highest plateau, a vast wildflower meadow in Pakistan', facts: ['A high-altitude plateau in Gilgit-Baltistan, Pakistan, with an average elevation of 4,114 metres — the world\'s second-highest plateau after the Tibetan Plateau', 'One of the last habitats of the Himalayan brown bear; also home to snow leopards, golden eagles, wolf and the rare Tibetan wolf — making it a critical wildlife sanctuary', 'Known as the "Land of Giants" (Deosai means "land of giants" in Balti); in summer, the vast plateau bursts into a spectacular carpet of wildflowers stretching as far as the eye can see', 'Deosai National Park was established in 1993 specifically to protect the Himalayan brown bear population, which had dwindled to just 19; numbers have since recovered to over 100', 'Completely snowbound and inaccessible from November to May; during the brief summer season it hosts crystal-clear lakes, including Sheosar Lake, and is one of Pakistan\'s most breathtaking landscapes'] },
    { secret: 'Redwood National Park', hint: 'The California forest home to the world\'s tallest living trees', facts: ['A national and state park system in coastal northern California, home to coast redwoods (Sequoia sempervirens) — the world\'s tallest living trees, reaching over 115 metres', 'The tallest known living tree on Earth, Hyperion, stands 115.9 metres (380 ft) tall and grows somewhere in this park; its exact location is kept secret to protect it from tourist damage', 'Coast redwoods can live for over 2,000 years; many of the trees standing today were saplings during the Roman Empire', 'Logging in the 19th and 20th centuries destroyed over 95% of the original old-growth redwood forest; the park protects what remains and was designated a UNESCO World Heritage Site in 1980', 'The forest creates its own microclimate: the towering canopy traps coastal fog and drips water to the forest floor, sustaining a lush ecosystem of ferns, mosses and wildlife including Roosevelt elk and marbled murrelets'] },
    { secret: 'Temple of Heaven', hint: 'The imperial complex in Beijing where Chinese emperors prayed for good harvests', facts: ['A magnificent imperial religious complex in the southeastern part of central Beijing, built between 1406 and 1420 during the reign of Emperor Yongle of the Ming dynasty', 'Used by the emperors of the Ming and Qing dynasties to perform annual ceremonies of prayer to Heaven for a good harvest — the most solemn ritual of the Chinese imperial calendar', 'The complex covers 2.73 square kilometres — three times the size of the Forbidden City — and is divided into inner and outer sections surrounded by two concentric walls', 'Its most famous structure is the Hall of Prayer for Good Harvests — a spectacular circular wooden hall with a triple-tiered blue glazed tile roof, built entirely without nails', 'Designated a UNESCO World Heritage Site in 1998; it is one of Beijing\'s most visited attractions and is considered the supreme example of Chinese imperial religious architecture'] },
    { secret: 'Potala Palace', hint: 'The towering former residence of the Dalai Lama perched above Lhasa, Tibet', facts: ['A massive palace complex in Lhasa, Tibet, standing 13 storeys high on Red Hill (Marpo Ri) and rising 117 metres above the valley floor — one of the world\'s highest palaces at 3,700 m above sea level', 'The original palace was built in the 7th century by Tibetan King Songtsen Gampo; the current structure was built from 1645 by the Fifth Dalai Lama and expanded over subsequent centuries', 'Served as the winter residence of the Dalai Lamas and the centre of Tibetan Buddhist government for over 300 years; contains over 1,000 rooms, 10,000 shrines and around 200,000 statues', 'Divided into the White Palace (administrative quarters) and the Red Palace (chapels and tombs of past Dalai Lamas); the tombs are sheathed in gold and studded with jewels', 'After the 14th Dalai Lama fled to India following China\'s 1959 crackdown, the palace became a museum; it was designated a UNESCO World Heritage Site in 1994'] },
    { secret: 'Three Gorges Dam', hint: 'The world\'s largest hydroelectric dam, spanning the Yangtze River in China', facts: ['A hydroelectric gravity dam spanning the Yangtze River in Hubei Province, China — the world\'s largest power station by installed capacity (22,500 megawatts)', 'Construction began in 1994 and was completed in 2006; the reservoir behind it stretches 660 km upstream, flooding 13 cities, 140 towns and 1,350 villages', 'The project displaced approximately 1.3 million people — one of the largest forced relocations in history — and submerged hundreds of archaeological sites and significant cultural heritage', 'The dam is 2,335 metres wide and 185 metres tall; it controls flooding on the Yangtze, which historically killed hundreds of thousands of people in the 20th century alone', 'So much water is held in the reservoir that NASA scientists calculated it has slightly slowed Earth\'s rotation and shifted the planet\'s axis by about 2 centimetres'] },
    { secret: 'Hoover Dam', hint: 'The iconic 1930s concrete arch dam on the Colorado River between Nevada and Arizona', facts: ['A massive concrete arch-gravity dam on the Colorado River, straddling the border between Nevada and Arizona, USA — built between 1931 and 1936 during the Great Depression', 'At the time of completion it was the world\'s largest hydroelectric power station and the world\'s largest concrete structure; it stands 221 metres tall and contains 3.3 million cubic metres of concrete', 'Built using a workforce of up to 5,000 men at a time; an estimated 96 workers died during construction (though some estimates place the true toll higher)', 'Created Lake Mead — the largest reservoir in the United States by water volume when full — which supplies water to Las Vegas, Phoenix, Los Angeles and agricultural areas across the American Southwest', 'A National Historic Landmark and one of America\'s most visited attractions; its Art Deco architecture, bronze sculptures and the observation deck make it as much a monument as a dam'] },
    { secret: 'Cape Canaveral', hint: 'NASA\'s primary rocket launch site on the Florida coast', facts: ['Located on a barrier island on Florida\'s Atlantic coast, Cape Canaveral has been the USA\'s primary space launch site since 1950', 'Home to Kennedy Space Center — from where all Apollo missions launched — and Cape Canaveral Space Force Station', 'Apollo 11, the mission that landed the first humans on the Moon in July 1969, launched from Launch Complex 39A here', 'The Space Shuttle program launched all 135 missions from Kennedy Space Center between 1981 and 2011', 'Today SpaceX, Boeing and NASA all launch rockets from Cape Canaveral; it remains the busiest orbital launch site in the world'] },
    { secret: 'Death Valley', hint: 'The hottest, driest and lowest place in North America', facts: ['A desert valley in Eastern California, USA — the hottest, driest, and lowest national park in North America, part of the Mojave Desert', 'Holds the world record for the highest reliably recorded air temperature: 56.7°C (134°F) on 10 July 1913 at Furnace Creek', 'Badwater Basin, within the valley, sits 86 metres below sea level — the lowest point in North America', 'Despite its extreme conditions, over 1,000 plant species and 440 animal species live there, including the endangered Devils Hole pupfish found in a single geothermal pool', 'The name was given by pioneers who barely survived crossing it in 1849–50 during the California Gold Rush; ironically, only one member of the party actually died there'] },
    { secret: 'United Nations Headquarters', hint: 'The New York campus where world leaders gather to shape global policy', facts: ['Located on an 18-acre site in Midtown Manhattan, New York City — technically international territory, not US soil', 'Established in 1945 after World War II; the permanent New York headquarters opened in 1952, designed by an international team including Le Corbusier and Oscar Niemeyer', 'The General Assembly Building hosts the annual General Debate where leaders of 193 member states address the world each September', 'The Security Council — where the five permanent members (USA, UK, France, Russia, China) each hold a veto — is where history\'s most critical geopolitical decisions have been made', 'The UN complex contains its own post office, fire department and security force; it houses the Secretariat, General Assembly, Security Council, and Conference Building'] },
    { secret: 'The Pentagon', hint: 'The world\'s largest office building and headquarters of the US military', facts: ['Headquarters of the United States Department of Defense, located in Arlington, Virginia, across the Potomac River from Washington DC', 'The world\'s largest office building by floor area: 604,000 square metres across five floors with 28 km of corridors; approximately 23,000 military and civilian employees work there', 'Built in just 16 months between 1941 and 1943; its five-sided shape was partly dictated by the original plot of land', 'On 11 September 2001, hijacked American Airlines Flight 77 crashed into its western side, killing 184 people; the damaged section was rebuilt within a year', 'Inside, a 1.9-hectare park sits in the central courtyard, nicknamed "Ground Zero" during the Cold War because Soviet planners reportedly believed it was a command bunker'] },
    { secret: 'International Space Station', hint: 'The largest structure ever assembled in space, orbiting 400 km above Earth', facts: ['A habitable satellite in low Earth orbit approximately 400 km up, travelling at 28,000 km/h and completing 16 orbits per day', 'A joint project of five space agencies — NASA, Roscosmos, JAXA, ESA and CSA — the most expensive structure ever built at over $150 billion', 'Assembly began in 1998; the first long-duration crew arrived in November 2000 and it has been continuously inhabited ever since — the longest continuous human presence in space', 'About the size of a football field (109 metres across); contains six sleeping quarters, two bathrooms, a gym and the Cupola — a seven-window dome with panoramic views of Earth', 'Has hosted over 270 astronauts from 20 countries and served as a laboratory for over 3,000 experiments in biology, physics, astronomy and meteorology'] },
    { secret: 'CERN', hint: 'The world\'s largest particle physics laboratory, home of the Large Hadron Collider', facts: ['The European Organisation for Nuclear Research — CERN is the world\'s largest particle physics laboratory, straddling the Swiss-French border near Geneva', 'Home to the Large Hadron Collider (LHC): a 27 km circular tunnel buried 100 metres underground where particles are accelerated to 99.9999991% the speed of light', 'On 4 July 2012 CERN announced the discovery of the Higgs boson — the "God particle" — confirming the final missing piece of the Standard Model of particle physics', 'Tim Berners-Lee invented the World Wide Web at CERN in 1989 as an internal document-sharing tool; CERN gave it to the world for free in 1993', 'Founded in 1954 with 12 member states; now has 23 member states and is the site of some of the most fundamental discoveries in the history of science'] },
    { secret: 'Harvard University', hint: 'The oldest university in the United States, synonymous with academic excellence', facts: ['Founded in 1636 in Cambridge, Massachusetts — the oldest institution of higher learning in the United States, established just 16 years after the Pilgrims landed at Plymouth Rock', 'Named after its first major benefactor, Reverend John Harvard, who left his library and half his estate to the institution upon his death in 1638', 'Alumni include 8 US presidents (including Obama, JFK and both Roosevelts), 160+ Nobel laureates, and dozens of heads of state worldwide', 'Harvard\'s endowment was approximately $50 billion in 2023 — the largest of any educational institution in the world', 'Located in Cambridge, MA; its acceptance rate is under 4%, making it one of the most selective universities on Earth'] },
    { secret: 'Oxford University', hint: 'The oldest English-speaking university in the world', facts: ['The University of Oxford is the oldest university in the English-speaking world, with teaching dating back to at least 1096 AD — over 900 years old', 'Organised as a federation of 39 self-governing colleges; students belong to both the university and a college, giving it a uniquely decentralised structure', 'Alumni include 28 British Prime Ministers (including Thatcher, Blair and Boris Johnson), 72 Nobel laureates, and 50+ heads of state globally', 'The Bodleian Library (opened 1602) holds over 13 million items and receives a legal deposit copy of every book published in the UK', 'J.R.R. Tolkien was a professor here; C.S. Lewis, Lewis Carroll and Oscar Wilde also studied at Oxford; its "dreaming spires" have been the setting for countless films and TV series'] },
    { secret: 'Al-Azhar University', hint: 'The world\'s oldest continuously operating Islamic university, in Cairo', facts: ['Founded in 970–972 AD in Cairo, Egypt — widely considered the world\'s oldest continuously operating degree-granting university and the premier centre of Sunni Islamic learning', 'Established by the Fatimid Caliph al-Mu\'izz; the mosque (built 970 AD) and the university developed together; "Al-Azhar" likely refers to Fatima al-Zahra, daughter of the Prophet Muhammad (PBUH)', 'The Grand Imam of Al-Azhar is one of the most influential religious authorities in the Sunni Muslim world, with his fatwas carrying enormous weight across the Islamic world', 'Draws students from over 100 countries — from Indonesia to Nigeria to Central Asia — making it a truly global centre of Islamic education covering both religious and secular subjects', 'Al-Azhar played a historic role resisting Napoleon\'s occupation of Egypt (1798–1801) and remains a powerful symbol of Egyptian and Islamic cultural identity'] },
    { secret: 'Al-Aqsa Mosque', hint: 'The third holiest site in Islam, on Temple Mount in Jerusalem', facts: ['Located on the Temple Mount (Haram al-Sharif) in the Old City of Jerusalem — the third holiest site in Islam, after the mosques in Mecca and Medina', 'Built by Umayyad Caliph al-Walid between 705 and 715 AD on the site where, according to Islamic tradition, the Prophet Muhammad (PBUH) ascended to heaven during the Night Journey (Isra and Mi\'raj)', 'Can accommodate around 5,000 worshippers inside and tens of thousands more on the Temple Mount plaza; on Fridays during Ramadan, hundreds of thousands pray here', 'The most contested religious site in the world — claimed and revered by both Muslims and Jews (who call it the Temple Mount, site of the First and Second Temples)', 'Israel captured East Jerusalem including the Temple Mount in the 1967 Six-Day War; under a longstanding arrangement, Jordan\'s Waqf administers the site while Israel controls security'] },
    { secret: 'Dome of the Rock', hint: 'Jerusalem\'s iconic golden-domed Islamic shrine on the Temple Mount', facts: ['An Islamic shrine at the centre of the Temple Mount in Jerusalem, completed in 691–692 AD — one of the oldest Islamic structures in the world, predating Al-Aqsa Mosque', 'Commissioned by Umayyad Caliph Abd al-Malik; its golden dome — regilded with gold by King Hussein of Jordan in 1993 — is the most recognisable landmark on Jerusalem\'s skyline', 'Built over the Foundation Stone — a large exposed bedrock sacred to all three Abrahamic faiths: the site where Abraham prepared to sacrifice his son, and where Islamic tradition places the Prophet\'s ascent to heaven', 'The interior is decorated with extraordinary 7th-century Byzantine and early Islamic mosaics and calligraphy — among the finest examples of early Islamic art in existence', 'It is a shrine and pilgrimage site, NOT a mosque — the Al-Aqsa Mosque nearby is the actual place of congregational prayer on the same Temple Mount compound'] },
    { secret: 'Scottish Highlands', hint: 'Scotland\'s rugged wilderness of mountains, lochs and ancient glens', facts: ['A vast mountainous region covering northern and western Scotland — one of the last great wildernesses in Western Europe, covering about 40,000 km²', 'Home to Ben Nevis (1,345 m) — the highest peak in the British Isles — and Loch Ness, famous for the legendary monster "Nessie" first reported in the 6th century', 'The Highlands were the heartland of the Scottish clan system; the Battle of Culloden (1746) — the last pitched battle on British soil — saw the brutal suppression of Highland culture', 'The Highland Clearances (1750s–1860s) saw landlords forcibly evict hundreds of thousands of Highlanders to make way for sheep farming, scattering Scottish communities across North America and Australia', 'Today the Highlands attract visitors for wildlife (red deer, golden eagles, ospreys), whisky distilleries, hiking the West Highland Way, and dramatic scenery featured in Braveheart, Skyfall and the Harry Potter series'] },
    { secret: 'Korean Demilitarized Zone (DMZ)', hint: 'The heavily fortified buffer strip dividing North and South Korea', facts: ['A strip of land 4 km wide running 250 km across the Korean peninsula, separating North and South Korea — created by the 1953 Korean Armistice Agreement', 'Technically the two Koreas are still at war — the armistice was a ceasefire, not a peace treaty — making this the world\'s most dangerous active border', 'The most heavily militarised border in the world; North Korea alone has over 2,000 artillery pieces capable of hitting Seoul, which lies just 55 km south of the DMZ', 'Ironically the DMZ has become one of Asia\'s most important nature reserves — 70 years of near-zero human activity has allowed rare species including Amur leopard cats, Asiatic black bears and endangered cranes to thrive', 'The Joint Security Area at Panmunjom (the "Truce Village") is the only point where soldiers from both sides stand face-to-face; US President Trump crossed into North Korea there in 2019 — the first sitting US president to do so'] },
    { secret: 'Palmyra (Tadmor)', hint: 'The ancient "Bride of the Desert" city in Syria, partly destroyed by ISIS', facts: ['An ancient Semitic city in the Syrian desert, approximately 215 km northeast of Damascus — one of the most important cultural centres of the ancient world', 'Known as the "Bride of the Desert"; under Queen Zenobia in the 3rd century AD the Palmyrene Empire briefly controlled Egypt and much of the Near East before being crushed by Rome', 'Its remarkably preserved ruins — the Temple of Bel, Valley of Tombs, Roman colonnaded street and ancient theatre — made it a UNESCO World Heritage Site in 1980', 'In 2015 ISIS captured Palmyra, executed its 81-year-old antiquities curator Khaled al-Asaad (who refused to reveal where treasures were hidden), and deliberately demolished several iconic monuments including the Temple of Bel and the Arch of Triumph', 'Syrian and international forces recaptured Palmyra in 2016; international restoration efforts continue, though many destroyed monuments cannot be fully recovered'] },
    { secret: 'Ephesus (Efes)', hint: 'One of the best-preserved ancient Greek and Roman cities in the world, in Turkey', facts: ['An ancient Greek and later Roman city on the western coast of present-day Turkey, near modern Selçuk — one of the largest and best-preserved ancient cities in the world', 'At its peak in the 1st century AD Ephesus had a population of up to 500,000 and was the capital of the Roman province of Asia — one of the empire\'s most important cities', 'Home to the Temple of Artemis — one of the Seven Wonders of the Ancient World, four times larger than the Parthenon; it was burned by Herostratus in 356 BC (reportedly the night Alexander the Great was born) and later destroyed by the Goths in 262 AD', 'The Apostle Paul lived in Ephesus for two to three years and addressed an epistle to its Christians; according to tradition the Virgin Mary spent her last years near the city in a small house still visited by pilgrims today', 'The Library of Celsus (117 AD) — whose two-storey facade still stands — held 12,000 scrolls and was the third-largest library in the ancient world; the city was gradually abandoned after its harbour silted up, leaving ruins extraordinarily intact'] },
    { secret: 'Caspian Sea', hint: 'The world\'s largest lake — a landlocked inland sea between Europe and Asia', facts: ['The largest inland body of water in the world by both area (371,000 km²) and volume; despite its name it is technically a lake, having no natural outlet to any ocean', 'Bordered by five countries: Russia, Kazakhstan, Turkmenistan, Iran and Azerbaijan; its coastline stretches over 7,000 kilometres', 'Its surface sits approximately 28 metres below sea level; it contains about 40–44% of the world\'s total lake water by volume', 'Home to the beluga sturgeon — the source of the world\'s most prized caviar; decades of overfishing and pollution have critically endangered the species', 'Vast oil and gas reserves beneath the Caspian have made it a zone of intense geopolitical competition since the dissolution of the Soviet Union in 1991'] },
    { secret: 'Grand Canal (Venice)', hint: 'The grand S-shaped waterway that serves as Venice\'s main street, lined with Renaissance palaces', facts: ['The main waterway of Venice, Italy — approximately 3.8 km long, running through the city in a reverse S-shape and lined on both sides by more than 170 buildings mostly built between the 13th and 18th centuries', 'Serves as Venice\'s main artery — the equivalent of a high street; the primary transport along it is by vaporetto (water bus), gondola and private boat', 'Crossed by only four bridges: the Rialto Bridge (the oldest, dating to 1591), the Accademia, the Scalzi and the Costituzione (2008)', 'Venice was built on 118 small islands separated by 150 canals; the Grand Canal is the largest; the historic city centre has no roads accessible by car', 'Venice is slowly sinking at about 1–2mm per year due to groundwater extraction and rising sea levels; the MOSE flood barrier system was activated for the first time in 2020 to protect the UNESCO World Heritage city'] },
    { secret: 'Lake District', hint: 'England\'s largest national park — a landscape of mountains, valleys and glacial lakes in Cumbria', facts: ['A national park in Cumbria, northwest England — the largest in England at 2,362 km²; designated a UNESCO World Heritage Site in 2017', 'Shaped by glaciers during the last Ice Age; home to England\'s highest mountain (Scafell Pike, 978m) and largest natural lake (Windermere, 18km long)', 'Inspired the English Romantic movement: William Wordsworth was born in Cockermouth, lived at Dove Cottage in Grasmere and is buried there; Samuel Taylor Coleridge and Robert Southey also lived in the Lakes', 'Beatrix Potter lived at Hill Top Farm near Hawkshead; the Lake District landscapes directly inspired her Peter Rabbit stories and she used her book royalties to buy and preserve farms, later donating them to the National Trust', 'Receives around 19 million visitors per year — one of the most visited national parks in Europe; its popularity has raised serious concerns about overtourism and environmental damage'] },
    { secret: 'Trafalgar Square', hint: 'London\'s most famous public square, dominated by Nelson\'s Column and four bronze lions', facts: ['A public square in the heart of central London; built to commemorate the Battle of Trafalgar (1805) — the British naval victory in which Admiral Lord Nelson defeated the combined French and Spanish fleet', 'Dominated by Nelson\'s Column — a 52-metre granite column topped by a 5.5-metre statue of Admiral Horatio Nelson, guarded at its base by four large bronze lions designed by Edwin Landseer', 'Home to the National Gallery — one of the world\'s great art museums with free admission — and the historic church of St Martin-in-the-Fields', 'The traditional gathering point for New Year\'s Eve celebrations, political demonstrations and sporting victory celebrations in London', 'The Fourth Plinth — originally intended for an equestrian statue that was never funded — has since 1999 displayed rotating contemporary art commissions, making it the world\'s most prominent rotating public art platform'] },
    { secret: 'Lord\'s Cricket Ground', hint: 'The home of cricket — the world\'s most famous cricket ground in St John\'s Wood, London', facts: ['Located in St John\'s Wood, London; founded by Thomas Lord in 1814 and owned by Marylebone Cricket Club (MCC) — the guardian of the Laws of Cricket since 1788', 'Widely regarded as the spiritual home and cathedral of cricket; it hosts Test matches, ODIs, the Cricket World Cup finals and major domestic matches', 'Features the iconic Long Room — a members-only room through which players must walk to reach the pitch — and a famous slope across the outfield of 2.5 metres from one side to the other', 'The futuristic aluminium Media Centre — a self-supporting structure suspended above the stands — won the Stirling Prize for Architecture in 1999', 'Houses the Ashes urn — cricket\'s most famous trophy — and the MCC Museum, the world\'s oldest sporting museum operated continuously in the same location'] },
    { secret: 'Wimbledon', hint: 'The world\'s oldest tennis Grand Slam — played on grass courts in southwest London since 1877', facts: ['The Championships, Wimbledon — played at the All England Lawn Tennis and Croquet Club; first held in 1877, making it the world\'s oldest Grand Slam tennis tournament', 'The only Grand Slam still played on grass; the courts are a precise mixture of perennial ryegrass mown to exactly 8mm before play begins', 'Famous traditions include the strict all-white dress code for players, strawberries and cream served to spectators, and the Royal Box where members of the British Royal Family watch centre court play', 'Roger Federer holds the men\'s record with 8 singles titles; Martina Navratilova holds the women\'s record with 9 — both achieved at Wimbledon', 'Around 500,000 spectators attend across the fortnight; the Centre Court retractable roof (installed 2009) and Court 1 roof (2019) allow play to continue in rain'] },
    { secret: 'Roland Garros', hint: 'The French Open — the premier clay-court tennis Grand Slam, held in Paris each May', facts: ['The Roland Garros stadium in Paris hosts the French Open — one of tennis\'s four Grand Slams; first held in 1891, it is the premier clay-court tennis tournament in the world', 'Named after Roland Garros — a French World War I aviator and the first person to cross the Mediterranean Sea by aeroplane in 1913; he had no connection to tennis whatsoever', 'The distinctive red clay (actually crushed brick) slows the ball significantly and produces high bounces, favouring baseline players and producing longer rallies than any other Slam surface', 'Rafael Nadal won the French Open a record 14 times; his dominance on the clay of Roland Garros is considered the greatest single-venue achievement in the history of sport', 'The tournament runs across two weeks each May–June; the red clay courts reward endurance and topspin, producing the most physically demanding matches and the most dramatic upsets in Grand Slam tennis'] },
    { secret: 'Ascot Racecourse', hint: 'Britain\'s most glamorous horse racing venue and home of the Royal Ascot meeting', facts: ['A racecourse in Ascot, Berkshire, England; founded in 1711 by Queen Anne — one of the oldest racecourses in the world still in operation', 'Home to Royal Ascot — a five-day race meeting each June attended by the British Royal Family, widely regarded as the most prestigious social event in the British horse racing calendar', 'Royal Ascot is as famous for fashion as for racing; the Royal Enclosure enforces a strict dress code — top hats and morning dress for men, formal dresses with hats for women', 'The Gold Cup — run over 2.5 miles on Ladies\' Day (Thursday) — is the most prestigious long-distance Flat race in Britain', 'Hosts 26 race days per year; around 600,000 racegoers attend annually — one of the best-attended recurring sporting events in Britain'] },
    { secret: 'Windsor Castle', hint: 'The world\'s oldest and largest occupied castle — the weekend residence of the British Royal Family', facts: ['Located in Windsor, Berkshire; founded by William the Conqueror in the 11th century — the oldest and largest occupied castle in the world and the longest continuously occupied palace in Europe', 'The official residence and weekend retreat of the British monarch; every English and British sovereign since Henry I has used Windsor Castle', 'St George\'s Chapel within the grounds is one of Britain\'s finest Gothic buildings — the burial place of ten monarchs including Henry VIII, Charles I, George VI and Queen Elizabeth II', 'The castle covers 4.9 hectares (12 acres) with around 1,000 rooms; the Round Tower at its centre dates to the 12th century', 'In 1992 a devastating fire destroyed or damaged over 100 rooms; the £37 million restoration took five years and was partly funded by opening Buckingham Palace to the public for the first time'] },
    { secret: 'Palace of Westminster', hint: 'The Gothic riverside palace housing the British Parliament — the Houses of Commons and Lords', facts: ['Located on the north bank of the Thames in London; the seat of the Parliament of the United Kingdom, housing both the House of Commons and the House of Lords', 'The original medieval palace was largely destroyed by fire in 1834; the current building was designed by Charles Barry and Augustus Pugin in the Gothic Revival style, completed around 1870', 'The iconic Elizabeth Tower houses the bell Big Ben — technically "Big Ben" refers to the bell itself, not the tower or clock; the tower was renamed in honour of Queen Elizabeth II in 2012', 'A UNESCO World Heritage Site since 1987; contains over 1,100 rooms, 100 staircases and 4.8 km of corridors', 'A major £13 billion restoration project — one of the most expensive building projects in British history — has been debated for years to prevent structural collapse of the ageing Victorian building'] },
    { secret: 'Madame Tussauds', hint: 'The world-famous wax museum where visitors stand face-to-face with lifelike figures of celebrities and world leaders', facts: ['Founded by wax sculptor Marie Tussaud; the London museum opened on Baker Street in 1835 before moving to its current location on Marylebone Road', 'Marie Tussaud learned her craft in Paris during the French Revolution — commissioned to create death masks of executed aristocrats including Louis XVI and Marie Antoinette, making hyper-realistic wax portraiture her speciality', 'The London museum attracts around 2.5 million visitors per year and is one of the most visited tourist attractions in Britain', 'New wax figures of current celebrities require around four months to produce and cost up to £150,000 each; they are sculpted from hundreds of precise measurements and photographs', 'Has expanded into a global franchise with over 25 museums worldwide including New York, Amsterdam, Dubai, Bangkok and Sydney; each customises its collection to local tastes'] },
    { secret: 'Sundarbans', hint: 'The world\'s largest mangrove forest, spanning the delta of the Ganges in Bangladesh and India', facts: ['Located in the delta of the Ganges, Brahmaputra and Meghna rivers across Bangladesh and West Bengal, India — the world\'s largest mangrove forest at approximately 10,000 km²', 'A UNESCO World Heritage Site; the name means "beautiful forest" in Bengali; the landscape is an intricate maze of tidal waterways, mudflats and small islands', 'Home to around 400–500 Royal Bengal tigers, uniquely adapted to a saline tidal environment — these tigers regularly swim between islands and are among the few big cats known to prey habitually on humans', 'Local honey collectors and fishermen have long worn masks on the backs of their heads when entering the forest — tigers prefer to attack from behind and are reportedly deterred by a face', 'Severely threatened by climate change: rising sea levels are swallowing islands, increasing salinity is killing trees, and intensifying cyclones are devastating the habitat — the Sundarbans could lose 70% of its tiger territory by 2070'] },
    { secret: 'Chernobyl', hint: 'The site of the world\'s worst nuclear disaster — a Ukrainian city abandoned after the 1986 reactor explosion', facts: ['A city in northern Ukraine (then Soviet Union) next to the Chernobyl Nuclear Power Plant; on 26 April 1986, Reactor No. 4 exploded during a safety test — the worst nuclear accident in history, rated Level 7 on the International Nuclear Event Scale', 'The explosion released 400 times more radiation than the atomic bomb dropped on Hiroshima; radioactive fallout spread across most of Europe and was detectable as far away as Japan', 'Around 350,000 people were evacuated from the 30km Exclusion Zone; the nearest city Pripyat (population 50,000) was abandoned within 36 hours and remains a ghost town of decaying Soviet-era buildings', 'A concrete "sarcophagus" was built over the reactor in 206 days; a new steel containment structure — the New Safe Confinement — was installed in 2016 at a cost of €2.1 billion to contain radioactivity for the next 100 years', 'The Exclusion Zone has paradoxically become a thriving wildlife sanctuary — without humans, wolf, lynx and wild horse populations have surged; the site also became a major tourist destination after the acclaimed 2019 HBO television drama'] },
    { secret: 'Hiroshima', hint: 'The Japanese city that became the first target of an atomic bomb on 6 August 1945', facts: ['A city in western Japan; on 6 August 1945 the United States dropped "Little Boy" — the first atomic bomb ever used in warfare — instantly killing an estimated 70,000–80,000 people and destroying 5 km² of the city', 'The bomb was dropped from the B-29 Superfortress Enola Gay, piloted by Colonel Paul Tibbets; it detonated at 8:15am at 600 metres above the city — the chosen height to maximise the blast radius', 'The total death toll including those who died later from radiation sickness and injuries is estimated at 90,000–166,000; three days later a second bomb was dropped on Nagasaki, and Japan surrendered on 15 August 1945', 'The Genbaku Dome (Hiroshima Peace Memorial) — the skeletal ruins of the Industrial Promotion Hall, one of the only structures near the hypocentre to survive — was preserved as a UNESCO World Heritage Site as a monument against nuclear weapons', 'Rebuilt into a thriving city of 1.2 million people; the Hiroshima Peace Memorial Museum draws 1.7 million visitors annually; Hiroshima advocates globally for nuclear disarmament and hosted the G7 summit in 2023'] },
    { secret: 'Karbala', hint: 'The Iraqi city where Imam Husayn was martyred in 680 AD — the holiest site for Shia Muslims worldwide', facts: ['A city in central Iraq, 100km south-west of Baghdad; site of the Battle of Karbala on 10 Muharram 61 AH (10 October 680 AD) — one of the most pivotal events in Islamic history', 'Imam Husayn ibn Ali — the grandson of the Prophet Muhammad — was killed along with 72 companions by the vastly larger army of Yazid ibn Muawiyah; his refusal to give allegiance to Yazid is commemorated annually on Ashura', 'The Imam Husayn Shrine and the Abbas ibn Ali Shrine are the two principal holy sites; their golden domes and minarets are among the most ornately decorated buildings in the Islamic world', 'The annual Arba\'een pilgrimage — held 40 days after Ashura — draws an estimated 20–30 million pilgrims walking on foot from Najaf to Karbala, making it the largest annual human gathering on Earth', 'The events at Karbala are central to the Shia–Sunni division in Islam; for Shia Muslims worldwide, Husayn\'s martyrdom represents the eternal and universal struggle against injustice and oppression'] },
  ],
  invention: [
    { secret: 'The Printing Press', hint: 'A 15th century invention that spread knowledge worldwide', facts: ['Invented by Johannes Gutenberg in Germany around 1440', 'Used movable metal type, enabling books to be mass-produced for the first time', 'The first major work printed was the Gutenberg Bible, around 1455', 'Within 50 years, over 20 million books had been printed across Europe', 'Directly enabled the Renaissance, Reformation, and Scientific Revolution'] },
    { secret: 'The Telephone', hint: 'A 19th century device for voice communication at distance', facts: ['Alexander Graham Bell patented the first practical telephone on 7 March 1876', 'Famous first words spoken: "Mr. Watson, come here, I want to see you"', 'Elisha Gray filed a similar patent hours after Bell — courts awarded Bell the patent', 'Bell preferred to be remembered as a teacher of the deaf, not an inventor', 'The telephone fundamentally changed how people communicated across distances'] },
    { secret: 'Penicillin', hint: 'A life-saving medicine discovered almost by accident', facts: ['Discovered accidentally by Alexander Fleming in 1928 — mould contaminated his bacteria dish', 'The Penicillium mould was killing all the surrounding bacteria', 'Fleming published his findings but couldn\'t isolate the active ingredient and moved on', 'Howard Florey and Ernst Chain developed it into a usable medicine in the early 1940s', 'Mass production during WWII saved millions of lives; all three shared the 1945 Nobel Prize'] },
    { secret: 'The Internet', hint: 'A global network connecting billions of devices', facts: ['Originated from ARPANET, a US military research network first used in 1969', 'The first message sent was "LOGIN" — the system crashed after just "LO"', 'Tim Berners-Lee invented the World Wide Web in 1989, making it accessible to everyone', 'The first public website went live on 6 August 1991', 'Today over 5 billion people use the internet — more than 60% of the world population'] },
    { secret: 'The Steam Engine', hint: 'The invention that powered the Industrial Revolution', facts: ['James Watt\'s improved steam engine (1769) made it practical for widespread industrial use', 'Earlier versions existed (Newcomen\'s 1712 engine) but were far too inefficient', 'Watt\'s engine was four times more fuel-efficient than Newcomen\'s design', 'Powered factories, trains, and ships — transforming how goods were made and moved', 'The unit of power, the "watt", is named in his honour'] },
    { secret: 'The Light Bulb', hint: 'An invention that brought artificial light to everyday life', facts: ['Thomas Edison developed the first commercially viable incandescent bulb in 1879', 'He tested thousands of materials before finding carbonised bamboo as the ideal filament', 'Earlier versions existed but lasted only minutes — Edison made one lasting 1,200+ hours', 'He also built New York\'s first power station in 1882 to bring electricity to homes', 'Today\'s LED bulbs use up to 90% less energy than Edison\'s original incandescent design'] },
    { secret: 'The Wheel', hint: 'Possibly the most important invention in human history', facts: ['Believed to have been invented around 3500 BC in Mesopotamia (modern-day Iraq)', 'The earliest known use was not for transport but for pottery — the potter\'s wheel slightly predates the cart wheel', 'The wheeled vehicle (cart) appeared around 3200 BC and transformed trade, agriculture and warfare', 'The invention of the spoked wheel (around 2000 BC) enabled much faster chariots', 'Underpins virtually all machinery; many historians call it the single most important invention ever'] },
    { secret: 'Paper', hint: 'The invention that made writing portable and affordable', facts: ['Invented in China around 105 AD by Cai Lun, a court official under Emperor He of Han', 'Earlier writing surfaces included papyrus (Egypt), clay tablets (Mesopotamia) and silk (China)', 'Made from macerated plant fibres — bark, hemp and rags — pressed and dried into sheets', 'Knowledge of paper-making reached the Arab world by 751 AD and Europe by the 13th century', 'Mass-produced paper was the essential prerequisite for the Printing Press and the spread of literacy'] },
    { secret: 'The Telescope', hint: 'An instrument that let humans see the stars up close', facts: ['The first practical telescope was made by Dutch spectacle-maker Hans Lippershey in 1608', 'Galileo Galilei improved the design and used it to observe space in 1609, discovering Jupiter\'s four largest moons', 'His observations provided key evidence that the Earth orbits the Sun, not the other way around', 'Newton\'s reflecting telescope (1668) used mirrors instead of lenses, solving colour distortion', 'Today\'s space telescopes, including Hubble and the James Webb, peer billions of light-years into the universe'] },
    { secret: 'The Microscope', hint: 'A device that revealed the invisible world of germs and cells', facts: ['The compound microscope was invented around 1590, credited to Dutch spectacle-makers Hans and Zacharias Janssen', 'Antonie van Leeuwenhoek (1670s) built superior microscopes — the first to observe bacteria, red blood cells and microorganisms', 'His discoveries founded the field of microbiology and proved the germ theory of disease', 'The electron microscope (1931) can magnify objects up to 10 million times', 'Microscopes enabled vaccine development, cancer diagnosis, genetics research and the understanding of DNA'] },
    { secret: 'The Automobile', hint: 'The self-propelled vehicle that changed how we live', facts: ['Karl Benz created the first true automobile — the Benz Patent-Motorwagen — in 1885', 'Nikolaus Otto had already invented the four-stroke internal combustion engine (1876) that powered it', 'Henry Ford\'s Model T (1908) and assembly line made cars affordable for ordinary people for the first time', 'The car transformed society: enabling suburbs, fast food, long-distance travel and the 20th-century economy', 'Approximately 1.4 billion cars are on the world\'s roads today, contributing significantly to climate change'] },
    { secret: 'The Airplane', hint: 'The Wright Brothers\' flying machine that shrank the world', facts: ['The Wright Brothers achieved the first powered, controlled flight on 17 December 1903 at Kitty Hawk, North Carolina', 'The first flight lasted 12 seconds and covered 36 metres; the fourth flight of the day covered 260 metres in 59 seconds', 'Within 10 years, aircraft were being used in World War I; within 20 years, commercial aviation had begun', 'Charles Lindbergh completed the first solo non-stop transatlantic flight in 1927, from New York to Paris in 33.5 hours', 'Over 100,000 commercial flights take off every day, carrying approximately 4.5 billion passengers per year'] },
    { secret: 'The Camera', hint: 'An invention that captured moments for the first time', facts: ['The first permanent photograph was taken by Joseph Nicéphore Niépce in 1826, requiring an 8-hour exposure', 'Louis Daguerre invented the Daguerreotype in 1839 — the first practical photographic process', 'George Eastman founded Kodak (1888) and roll film brought photography to ordinary people', 'The first digital camera was built by Kodak engineer Steven Sasson in 1975; it weighed 3.6 kg and took 23 seconds per image', 'Today smartphones worldwide take approximately 1.4 trillion photos per year'] },
    { secret: 'The Computer', hint: 'A machine that processes information and changed everything', facts: ['The first electronic computer was ENIAC (1945) in the USA — it weighed 30 tonnes and occupied 167 square metres', 'Alan Turing\'s theoretical "universal machine" concept (1936) laid the mathematical foundation for all modern computing', 'The invention of the transistor (1947) and integrated circuit (1958) made computers small, fast and affordable', 'Apple\'s Apple II (1977) was one of the first commercially successful personal computers', 'Today\'s smartphones are millions of times more powerful than the room-sized computers of the 1950s'] },
    { secret: 'The Smartphone', hint: 'A pocket-sized computer that changed daily life globally', facts: ['Apple\'s iPhone, unveiled by Steve Jobs on 9 January 2007, is widely considered the first modern smartphone', 'Jobs called it "three revolutionary products in one": phone, iPod and internet browser — all on a touchscreen', 'The first app stores launched in 2008, creating a trillion-dollar software industry', 'Within 3 years smartphones had transformed communication, navigation, photography, shopping and social interaction', 'Today over 6.8 billion smartphones are in use worldwide — nearly one per person on Earth'] },
    { secret: 'Artificial Intelligence (AI)', hint: 'A technology that enables machines to think and learn', facts: ['The term "Artificial Intelligence" was coined by John McCarthy at a 1956 Dartmouth College conference', 'Alan Turing\'s 1950 paper posed "Can machines think?" and proposed the Turing Test to measure machine intelligence', 'AlphaGo (2016) defeated the world\'s best Go player — a game considered too complex for machines to master', 'ChatGPT (2022) and large language models triggered a global AI revolution, transforming every industry', 'AI now powers facial recognition, medical diagnosis, self-driving cars, translation and content creation'] },
    { secret: '3D Printing', hint: 'A technology that builds objects layer by layer from digital files', facts: ['Invented by Chuck Hull in 1983 and patented in 1986; he called the process stereolithography', 'Uses a digital design file to deposit material (plastic, metal, concrete, even living tissue) layer by layer', 'NASA uses 3D printing for rocket components; surgeons use it for customised bone implants and prosthetics', 'Houses, cars and aeroplane components have all been 3D printed at scale', 'Bioprinting — printing living tissue — may eventually allow the creation of functioning human organs for transplant'] },
    { secret: 'Vaccination', hint: 'A medical breakthrough that has saved hundreds of millions of lives', facts: ['Edward Jenner developed the world\'s first vaccine in 1796 by infecting a boy with cowpox to protect him from smallpox', 'The word "vaccine" comes from the Latin "vacca" (cow) in honour of cowpox\'s role in the discovery', 'Louis Pasteur extended Jenner\'s work, developing vaccines for cholera and rabies in the 1880s', 'Vaccination eradicated smallpox in 1980 — the only human disease ever fully eradicated', 'The COVID-19 vaccines (2020) were developed in under a year — the fastest vaccine development in history'] },
    { secret: 'X-ray', hint: 'A discovery that let doctors see inside the human body', facts: ['Discovered by German physicist Wilhelm Röntgen on 8 November 1895; he won the first Nobel Prize in Physics in 1901', 'Named "X-ray" because their nature was unknown — "X" denotes the unknown in mathematics', 'Röntgen produced the first X-ray image of a human body — his wife\'s hand, complete with her wedding ring', 'Within months of the discovery, X-ray machines were being used in hospitals worldwide', 'Led to CT scanning, PET scanning, and modern medical imaging — now saving millions of lives yearly'] },
    { secret: 'Discovery of DNA Structure', hint: 'The double helix that unlocked the code of life', facts: ['The double-helix structure of DNA was discovered by James Watson and Francis Crick in 1953 at Cambridge University', 'Their discovery was based crucially on X-ray crystallography work by Rosalind Franklin, who received little credit', 'DNA (deoxyribonucleic acid) carries the genetic instructions for all living things', 'Watson, Crick and Maurice Wilkins shared the 1962 Nobel Prize; Franklin had died in 1958', 'The discovery unlocked genetics, forensic science, genetic medicine, ancestry testing and the Human Genome Project'] },
    { secret: 'The Jet Engine', hint: 'The engine that made fast air travel possible', facts: ['Independently invented by Frank Whittle (UK) and Hans von Ohain (Germany) in the 1930s', 'The first jet-powered aircraft, the Heinkel He 178, flew in Germany on 27 August 1939', 'Works by drawing in air, compressing it, mixing it with fuel, burning it, and expelling exhaust rearward for thrust', 'Transformed air travel: propeller aircraft took 15–25 hours to cross the Atlantic; jets do it in 7–8 hours', 'Also powers military jets and is the principle underlying all rocket engines that reach space'] },
    { secret: 'The Refrigerator', hint: 'An invention that transformed food storage and global supply chains', facts: ['The first practical vapour-compression refrigerator was built by Carl von Linde in Germany in 1876', 'Before refrigeration, ice harvesting was a major industry — cut from frozen lakes and shipped worldwide', 'Electrified domestic refrigerators became common in the 1920s–30s, transforming food storage and diet', 'Made global food supply chains possible: meat from Argentina, fruit from Chile, fish from Norway', 'Also essential for medicine — vaccines, blood and many drugs require refrigeration to remain effective'] },
    { secret: 'The Submarine', hint: 'A vessel that travels and fights entirely beneath the waves', facts: ['The first successful military submarine, the CSS Hunley (Confederate, 1863), sank a Union warship during the US Civil War', 'John Holland developed the modern submarine; his Holland VI (1897) was purchased by the US Navy', 'Submarines played a decisive role in both World Wars, threatening Allied Atlantic supply lines in WWII', 'Nuclear submarines (from 1955) can stay submerged indefinitely — powered by a reactor requiring no air', 'Today\'s nuclear ballistic missile submarines form the hidden second-strike deterrent of nuclear powers'] },
    { secret: 'The Washing Machine', hint: 'An invention that liberated people from hours of manual laundry', facts: ['The first hand-powered washing machine was patented in the United States by Nathaniel Briggs in 1797', 'The first electric washing machines appeared around 1908, made by American firms including Maytag', 'Before washing machines, laundry took an entire day of hard physical labour', 'Economist Hans Rosling argued the washing machine was the greatest invention of the Industrial Revolution, freeing time for education', 'Today over 1 billion washing machines are in use worldwide'] },
    { secret: 'Plastic', hint: 'A synthetic material that transformed modern manufacturing', facts: ['The first synthetic plastic, Bakelite, was invented by Leo Baekeland in 1907', 'Made from polymers — long chains of molecules derived mostly from fossil fuels (oil and gas)', 'By the mid-20th century plastic had replaced wood, metal and glass in thousands of applications', 'Global plastic production reached 390 million tonnes per year by 2021', 'Plastic pollution is a major environmental crisis: an estimated 8 million tonnes enter the oceans each year'] },
    { secret: 'Velcro', hint: 'A fastening invention inspired by burr seeds sticking to a dog', facts: ['Invented by Swiss engineer George de Mestral in 1941, inspired by burr seeds that stuck to his dog\'s fur after a walk', 'He examined the burrs under a microscope and saw tiny hooks catching in loops of fabric', 'His design — one strip of tiny hooks, one strip of tiny loops — was patented in 1955', 'Initially met with scepticism; only took off when NASA used it in spacesuits in the 1960s (perfect for zero gravity)', 'Today approximately 60 million metres of Velcro are produced each year'] },
    { secret: 'Harnessing Electricity', hint: 'The discovery that powers modern civilisation', facts: ['Benjamin Franklin\'s kite experiment (1752) proved lightning was electrical; he invented the lightning rod', 'Thomas Edison opened the world\'s first commercial electric power station in 1882 in New York City', 'Nikola Tesla and George Westinghouse championed AC (alternating current) for long-distance power transmission', 'The first high-voltage AC transmission line was demonstrated in 1891 near Frankfurt, Germany', 'Electricity transformed every aspect of modern life — lighting, heating, computing, communication and transport all depend on it'] },
    { secret: 'Algebra', hint: 'A branch of mathematics invented by a 9th-century Persian scholar', facts: ['The word "algebra" comes from Arabic "al-jabr" — the title of a 9th-century book by Persian mathematician al-Khwarizmi', 'His book Al-Kitab al-mukhtasar fi hisab al-jabr (c.820 AD) laid the foundations of algebra', 'Al-Khwarizmi\'s name also gave us the word "algorithm" — a set of steps for solving a problem', 'Algebra uses symbols and letters to represent numbers and quantities in formulae and equations', 'It is the foundation of mathematics, physics, engineering, computing, economics and modern science'] },
    { secret: 'Solar Power', hint: 'Turning sunlight into electricity using panels', facts: ['The photovoltaic effect — generating electricity from sunlight — was discovered by Edmond Becquerel in 1839', 'The first practical solar cell was built by Bell Labs in 1954, converting about 6% of sunlight into electricity', 'Initially used mainly in spacecraft from the 1950s; too expensive for widespread use on Earth for decades', 'Solar panel costs have fallen over 99% since 1976, making solar the cheapest source of electricity in history by 2020', 'In 2023 solar power provided over 4% of global electricity — a rapidly growing share as the world shifts from fossil fuels'] },
    { secret: 'Radio', hint: 'The invention that sent sound through the air without wires', facts: ['The practical development of radio communication is credited to Guglielmo Marconi, who transmitted signals over 3 km in 1895', 'Reginald Fessenden made the first voice radio broadcast on Christmas Eve 1906 — ships\' operators heard music and speech instead of Morse code', 'Radio transformed mass communication: by the 1930s it was the dominant global medium for news, entertainment and political messaging', 'During WWII radio was essential for both military coordination and propaganda; Churchill\'s and Roosevelt\'s wartime speeches reached millions', 'Radio frequencies now carry everything from AM/FM broadcasts to Wi-Fi, Bluetooth, mobile phone calls and satellite communication'] },
    { secret: 'Television', hint: 'The invention that brought moving pictures into every home', facts: ['Scottish inventor John Logie Baird gave the first public demonstration of a working television on 26 January 1926 in London', 'Philo Farnsworth independently developed an all-electronic television system in the USA around the same time; the credit is disputed', 'The BBC launched the world\'s first regular public television service from Alexandra Palace, London, in 1936', 'US television ownership grew from under 1% of households in 1948 to nearly 90% by 1960 — one of the fastest technology adoptions in history', 'Television reshaped politics, culture and daily life; the 1960 Kennedy-Nixon debates, the 1969 Moon landing and 9/11 were defining "television moments"'] },
    { secret: 'Gunpowder', hint: 'The explosive compound that revolutionised warfare', facts: ['Invented in China around the 9th century AD by Taoist alchemists searching for an elixir of immortality — they found an explosive instead', 'Initially used in China for fire arrows, bombs and early guns; knowledge spread westward through the Islamic world to Europe by the 13th century', 'Transformed warfare: cannons made city walls obsolete, ending the age of castles; muskets replaced armoured knights, reshaping armies and social structures', 'Combined with printing and navigation, it is one of Francis Bacon\'s three inventions he said had changed the world more than any empire or ruler', 'Today\'s firearms, artillery and explosives are all descendants of the original Chinese black powder formula'] },
    { secret: 'The Compass', hint: 'The navigational tool that made long-distance sea voyages possible', facts: ['Invented in China around the 11th century AD; first used in Chinese geomancy before its navigational application was recognised', 'Knowledge of the compass reached the Islamic world by the 12th century and Europe by the late 12th century', 'Enabled sailors to navigate accurately far from coastlines, making ocean voyages — including Columbus\'s Atlantic crossing — feasible', 'A fundamental tool of the Age of Exploration; without it the European discovery of the Americas and sea routes to Asia would have been impossible', 'The basic principle — a magnetised needle aligning with Earth\'s magnetic field — remains unchanged in modern compasses, though GPS has largely replaced it for navigation'] },
    { secret: 'Dynamite', hint: 'Alfred Nobel\'s explosive invention that funded the Nobel Prizes', facts: ['Invented by Swedish chemist Alfred Nobel in 1867 by stabilising the highly unstable explosive nitroglycerin with diatomite (kieselguhr)', 'Nobel named it from the Greek "dynamis" meaning power; it was far safer to handle and transport than pure nitroglycerin', 'Rapidly adopted for construction, mining and quarrying — transforming civil engineering, enabling tunnels, railways and the Suez Canal\'s expansion', 'After a French newspaper mistakenly printed his obituary under the headline "The Merchant of Death is Dead," Nobel was horrified and created the Nobel Prizes in his will', 'Nobel left most of his vast fortune (derived largely from dynamite) to fund the Nobel Prizes in Physics, Chemistry, Medicine, Literature and Peace'] },
    { secret: 'Aspirin', hint: 'The world\'s most widely used medicine, derived from willow bark', facts: ['One of the world\'s oldest and most widely used medicines; the active compound salicylic acid has been used since antiquity from willow bark', 'Bayer chemist Felix Hoffmann synthesised acetylsalicylic acid in 1897, creating a more tolerable form of salicylic acid that caused less stomach irritation', 'Bayer trademarked it as "Aspirin" in 1899; after WWI Germany was forced to surrender the trademark as part of war reparations', 'For decades used primarily as a painkiller and fever reducer; in the 1980s it was discovered to prevent blood clots, making it a key treatment for heart attacks and strokes', 'Approximately 40,000 tonnes of aspirin are consumed globally each year — about 100 billion tablets'] },
    { secret: 'The Contraceptive Pill', hint: 'The hormonal medicine that gave women control over reproduction', facts: ['The combined oral contraceptive pill was first approved by the US FDA on 9 May 1960 — a pivotal date in 20th-century social history', 'Developed by biologist Gregory Pincus and gynaecologist John Rock with funding from birth control activist Margaret Sanger', 'Gave women reliable control over reproduction for the first time in history, enabling women to pursue careers and education on their own terms', 'Within two years of US approval, over 1 million American women were using it; within five years it was the most popular contraceptive in the USA', 'Credited by many historians as one of the key drivers of the feminist revolution and women\'s liberation movement of the 1960s and 1970s'] },
    { secret: 'GPS (Global Positioning System)', hint: 'The satellite navigation system that tells us exactly where we are', facts: ['A satellite-based navigation system operated by the United States military, originally called NAVSTAR GPS', 'Developed from the 1970s for US military use; President Reagan opened it to civilian use in 1983 following the KAL 007 airliner shootdown by the USSR', 'Operates using a constellation of at least 24 satellites; any GPS receiver needs signals from at least four to determine precise location', 'Became freely available to civilian users at full accuracy in May 2000 when President Clinton ordered the removal of "Selective Availability" degradation', 'Now used in smartphones, cars, shipping, aviation, surveying, agriculture and emergency services; generates an estimated $1.4 trillion in economic value annually'] },
    { secret: 'Radar', hint: 'The technology that detects objects using radio waves', facts: ['Stands for "Radio Detection And Ranging" — a system that uses radio waves to detect and locate objects', 'Developed simultaneously in several countries in the 1930s; Britain\'s Chain Home radar network was operational by 1940 and critical in the Battle of Britain', 'During WWII radar enabled British fighter control to detect incoming German aircraft before they were visible, giving RAF pilots decisive tactical advantage', 'After the war, radar was adopted for air traffic control, weather forecasting, speed cameras and ship navigation', 'Modern phased-array radars on warships can track hundreds of targets simultaneously; weather radars now provide real-time storm tracking worldwide'] },
    { secret: 'MRI Scanner', hint: 'A medical machine that images the body\'s soft tissue without X-rays or surgery', facts: ['Magnetic Resonance Imaging uses powerful magnetic fields and radio waves to create detailed 3D images of organs and soft tissue', 'Based on the physics of Nuclear Magnetic Resonance (NMR) discovered by Felix Bloch and Edward Purcell in 1946 (Nobel Prize 1952)', 'Paul Lauterbur and Peter Mansfield developed the imaging application; they shared the 2003 Nobel Prize in Physiology or Medicine', 'The first MRI scan of a living human was performed in 1977; commercial MRI machines became available in the early 1980s', 'Transformed medicine: enables diagnosis of brain tumours, stroke, spinal injuries and joint damage without radiation or invasive procedures'] },
    { secret: 'Morse Code', hint: 'A system of dots and dashes that transmitted the first long-distance messages', facts: ['A communication system using dots and dashes to represent letters and numbers, developed by Samuel Morse and Alfred Vail in the 1830s', 'The first Morse telegraph message, "What hath God wrought," was sent from Washington D.C. to Baltimore on 24 May 1844', 'Enabled messages to be transmitted almost instantaneously over long distances for the first time in history — a revolution in communication', 'The international distress signal SOS (···−−−···) was adopted because of its simplicity in Morse Code; it does not stand for any particular words', 'Used in maritime and military communication until the late 20th century; the last commercial Morse message in the USA was sent in 1999'] },
    { secret: 'Anaesthesia', hint: 'The medical breakthrough that made surgery painless', facts: ['The first public demonstration of surgical anaesthesia using ether was performed by William Morton at Massachusetts General Hospital on 16 October 1846', 'Before anaesthesia, surgery was performed on conscious patients held down by assistants; speed was the surgeon\'s most valued skill', 'The first operation took about 25 minutes; the patient later said he felt nothing — the watching surgeons reportedly wept with relief', 'Chloroform was introduced as an alternative to ether in 1847; Queen Victoria used chloroform during childbirth in 1853, making it socially acceptable', 'Modern anaesthesia using precise drug combinations allows operations lasting many hours; it transformed surgery from emergency last resort to routine medical procedure'] },
    { secret: 'The Battery', hint: 'The device that stores electrical energy and powers portable electronics', facts: ['The first electrochemical battery, the "Voltaic Pile," was invented by Alessandro Volta in 1800', 'Volta\'s device stacked discs of zinc, copper and paper soaked in brine, producing a steady electrical current for the first time', 'The invention allowed scientists to study electrical current continuously — previously only brief static discharges were available', 'Lead-acid batteries (1859) powered early cars and are still used in car starters today; lithium-ion batteries (1991) power smartphones, laptops and electric vehicles', 'Without batteries, no portable device — from hearing aids to electric cars — would function; the global battery market is worth hundreds of billions of dollars'] },
    { secret: 'Concrete', hint: 'The building material that holds together the modern world', facts: ['The most widely used construction material in the world; approximately 30 billion tonnes are produced globally each year', 'Ancient Romans used a form of concrete (opus caementicium) incorporating volcanic ash — the Pantheon\'s unreinforced concrete dome has stood for 2,000 years', 'Modern Portland cement concrete was developed in the 19th century; reinforced concrete (with steel rods) was invented in the 1850s–60s', 'Reinforced concrete made possible the skyscraper, the modern bridge, the dam, the tunnel and virtually all of modern urban infrastructure', 'Cement production contributes approximately 8% of global CO₂ emissions — making it one of the most significant industrial contributors to climate change'] },
    { secret: 'The Barcode', hint: 'The striped symbol that transformed retail and logistics', facts: ['A machine-readable pattern of parallel lines (and spaces) representing data — most commonly numbers', 'Invented by Norman Woodland and Bernard Silver in 1952; inspired by Morse Code — Woodland was a former Boy Scout who scratched dots and dashes in the sand', 'The first product ever scanned using a barcode at a checkout was a packet of Wrigley\'s Juicy Fruit gum in Ohio on 26 June 1974', 'Transformed retail inventory management, supply chains and checkout speed; the global barcode market is fundamental to modern trade', 'QR codes (Quick Response codes), invented in Japan in 1994, are two-dimensional barcodes that can store far more information and are now ubiquitous worldwide'] },
    { secret: 'CRISPR Gene Editing', hint: 'A revolutionary tool that can rewrite the DNA of any living thing', facts: ['CRISPR-Cas9 is a gene-editing technology that allows scientists to precisely add, remove or alter DNA sequences in any living organism', 'Based on a natural defence mechanism found in bacteria; discovered by Jennifer Doudna and Emmanuelle Charpentier, who won the 2020 Nobel Prize in Chemistry', 'First used in human cells in 2013; the technology was rapidly adopted across global research laboratories', 'Applications include correcting genetic diseases (sickle cell anaemia was cured in clinical trials by 2023), developing disease-resistant crops and cancer therapies', 'The first CRISPR-edited human babies were controversially created in China in 2018 by scientist He Jiankui, who was subsequently imprisoned'] },
    { secret: 'The Clock', hint: 'The device that organised human time and made industrial society possible', facts: ['The mechanical clock was invented in medieval Europe around 1280–1300 AD, most likely in Italy or England', 'Before mechanical clocks, time was measured by sundials, water clocks and sand glasses — none of them portable or precise', 'The invention of the mainspring around 1400–1500 AD enabled portable watches and clocks — transforming personal time-keeping', 'Railway timetables in the 19th century required synchronised time across nations, leading to the adoption of standard time zones worldwide', 'Today\'s atomic clocks are accurate to within one second in 300 million years; they underpin GPS, the internet and modern financial transactions'] },
  ],
  character: [
    { secret: 'Sherlock Holmes', hint: 'A brilliant fictional detective from Victorian London', facts: ['Created by Arthur Conan Doyle; first appeared in A Study in Scarlet (1887)', 'Lives at 221B Baker Street, London, with his friend and chronicler Dr. John Watson', 'Famous for extraordinary deductive reasoning and hyper-keen observation', 'His arch-nemesis is Professor James Moriarty, "the Napoleon of Crime"', 'Doyle killed him off in 1893 but public outcry forced a resurrection in 1903'] },
    { secret: 'Harry Potter', hint: 'A young wizard from a celebrated modern book series', facts: ['Created by J.K. Rowling; first appeared in Harry Potter and the Philosopher\'s Stone (1997)', 'An orphan who discovers he is a wizard on his 11th birthday', 'Attends Hogwarts School of Witchcraft and Wizardry, sorted into Gryffindor house', 'Has a lightning-bolt scar from surviving Voldemort\'s Killing Curse as a baby', 'The series has sold over 600 million copies — one of the best-selling series ever'] },
    { secret: 'Darth Vader', hint: 'An iconic villain from a famous space opera franchise', facts: ['Real name Anakin Skywalker — a fallen Jedi who turned to the dark side of the Force', 'Appears in George Lucas\'s Star Wars, first in Episode IV: A New Hope (1977)', 'Recognised by his black armour, helmet, and distinctive mechanical breathing sound', 'Famous line: "No, I am your father" — one of cinema\'s greatest ever plot twists', 'Redeemed himself in Episode VI by saving his son Luke Skywalker, dying peacefully'] },
    { secret: 'Elizabeth Bennet', hint: 'A witty and independent heroine from a classic novel', facts: ['Protagonist of Jane Austen\'s Pride and Prejudice, published in 1813', 'Second of five Bennet sisters; known for her intelligence, wit, and independence', 'Her famous love interest is the proud and wealthy Mr. Fitzwilliam Darcy', 'Both misjudge each other at first before realising their mutual love', 'Often ranked among literature\'s greatest heroines for her humour and moral clarity'] },
    { secret: 'Gandalf', hint: 'A wise and powerful wizard from a beloved fantasy world', facts: ['Created by J.R.R. Tolkien; appears in The Hobbit (1937) and The Lord of the Rings (1954–55)', 'One of the Istari — angelic beings sent to Middle-earth to resist the dark lord Sauron', 'Known as Gandalf the Grey; returns as Gandalf the White after defeating the Balrog', 'Famous for his fireworks, his pipe, and "You shall not pass!" on the Bridge of Khazad-dûm', 'His true angelic name is Olórin; Gandalf is the name given by Men of the North'] },
    { secret: 'James Bond', hint: 'A famous fictional spy working for British intelligence', facts: ['Created by novelist Ian Fleming; first appeared in Casino Royale (1953)', 'A secret agent for MI6 with the code number 007', 'Famous for "Bond, James Bond" and Martinis "shaken, not stirred"', 'Has been played by seven official actors including Sean Connery and Daniel Craig', 'Fleming based Bond partly on wartime intelligence agents he worked with in WWII'] },
    { secret: 'Superman', hint: 'The original superhero from the planet Krypton', facts: ['Created by writer Jerry Siegel and artist Joe Shuster; first appeared in Action Comics #1 in 1938', 'Real name Kal-El, born on the planet Krypton; raised as Clark Kent in Smallville, Kansas', 'Has super-strength, speed, flight, heat vision and X-ray vision under Earth\'s yellow sun', 'His only weakness is Kryptonite — fragments of his destroyed home planet that drain his powers', 'The first superhero in the modern sense; his success created the entire superhero genre'] },
    { secret: 'Spider-Man', hint: 'A teenage superhero bitten by a radioactive spider', facts: ['Created by Stan Lee and Steve Ditko; first appeared in Amazing Fantasy #15 in 1962', 'Real name Peter Parker — a nerdy Queens teenager bitten by a radioactive spider giving him superpowers', 'Can climb walls, shoot webs, and has "Spider-Sense" — a precognitive awareness of danger', 'Famous quote: "With great power comes great responsibility" — said by his Uncle Ben before his murder', 'One of Marvel\'s most beloved characters; his films have collectively grossed over $9 billion worldwide'] },
    { secret: 'Batman', hint: 'A billionaire who fights crime with gadgets and detective skills', facts: ['Created by Bob Kane and Bill Finger; first appeared in Detective Comics #27 in 1939', 'Real name Bruce Wayne — a billionaire who witnessed his parents\' murder as a child', 'Has no superpowers; relies on intellect, detective skills, physical training and an arsenal of gadgets', 'Operates in Gotham City; villains include the Joker, Penguin, Two-Face and Catwoman', 'One of the most commercially successful fictional characters; his stories explore trauma, justice and heroism'] },
    { secret: 'The Hulk', hint: 'A physicist who turns into a giant green monster when angry', facts: ['Created by Stan Lee and Jack Kirby; first appeared in The Incredible Hulk #1 in 1962', 'Real name Dr Bruce Banner — a nuclear physicist bombarded by gamma radiation during a test', 'When Banner gets angry, he transforms into the Hulk — a massive green giant of near-limitless strength', 'Famous catchphrase: "Hulk SMASH!"; the madder the Hulk gets, the stronger he becomes', 'An exploration of rage, identity and duality — Banner and the Hulk share one body but are two personalities'] },
    { secret: 'Iron Man', hint: 'A billionaire inventor in a powered armour suit', facts: ['Created by Stan Lee, Larry Lieber, Don Heck and Jack Kirby; first appeared in Tales of Suspense #39 in 1963', 'Real name Tony Stark — a brilliant weapons billionaire who builds a powered armour suit to escape captivity', 'Has no inherent superpowers; his genius-level intellect and Iron Man armour are his weapons', 'Famous for quipping "I am Iron Man" — at a press conference and again facing Thanos in Avengers: Endgame', 'Robert Downey Jr\'s portrayal launched the most successful superhero franchise in film history'] },
    { secret: 'Captain America', hint: 'A WWII super-soldier who was frozen and awakened in modern times', facts: ['Created by Joe Simon and Jack Kirby; first appeared in Captain America Comics #1 in March 1941 — before America entered WWII', 'Real name Steve Rogers — a frail young man from Brooklyn transformed into a peak-human warrior by a super-soldier serum', 'Wields a vibranium shield that deflects attacks and can be thrown as a weapon', 'Frozen in ice after WWII and awakened in the modern era — a "man out of time" in a changed world', 'Represents idealism, sacrifice and the moral courage to stand against injustice even when it\'s unpopular'] },
    { secret: 'Thor', hint: 'The Norse god of thunder, also a Marvel superhero', facts: ['Created by Stan Lee, Larry Lieber and Jack Kirby; first appeared in Journey into Mystery #83 in 1962', 'Based on Thor, the Norse god of thunder; Marvel\'s Thor is a superhero who is also a literal Norse deity', 'Wields the enchanted hammer Mjolnir, which only the worthy can lift; can fly and summon lightning', 'Son of Odin the All-Father; his mischievous adopted brother Loki is his most famous adversary', 'Chris Hemsworth\'s portrayal in the MCU made Thor one of cinema\'s most popular superhero characters'] },
    { secret: 'Indiana Jones', hint: 'A university professor who hunts ancient artefacts for adventure', facts: ['A fictional archaeologist-adventurer created by George Lucas; first appeared in Raiders of the Lost Ark (1981)', 'Full name Dr Henry Walton Jones Jr. — a university professor by day, globe-trotting treasure hunter by adventure', 'Famous for his brown fedora hat, leather jacket and bullwhip; terrified of snakes despite constantly encountering them', 'His quests involve ancient artefacts including the Ark of the Covenant, the Holy Grail and crystal skulls', 'Played by Harrison Ford in five films; partly inspired by real 1930s adventurer-archaeologist Roy Chapman Andrews'] },
    { secret: 'Jack Sparrow', hint: 'A rum-loving pirate captain in the Caribbean', facts: ['A fictional pirate created by Ted Elliott and Terry Rossio; played by Johnny Depp in Pirates of the Caribbean (2003)', 'Captain of the Black Pearl — the fastest ship in the Caribbean — which he\'s frequently being separated from', 'Known for his eccentric, rum-soaked, unpredictable behaviour that often disguises sharp cunning', 'Carries a magical compass that points not north but to what the holder desires most', 'His introduction — stepping off a sinking boat onto a dock without breaking stride — is one of cinema\'s great character entrances'] },
    { secret: 'The Terminator', hint: 'An unstoppable robot assassin from the future', facts: ['A fictional assassin robot created by James Cameron; first appeared in The Terminator (1984)', 'Model T-800 — a titanium alloy endoskeleton covered in living tissue; nearly indestructible', 'Sent back from 2029 to 1984 to kill Sarah Connor, whose son will lead the human resistance against machines', 'Famous lines: "I\'ll be back" and (in Terminator 2) "Hasta la vista, baby"', 'Arnold Schwarzenegger\'s portrayal is one of cinema\'s most iconic; the film launched a major franchise'] },
    { secret: 'Dracula', hint: 'The original literary vampire from Transylvania', facts: ['Created by Irish author Bram Stoker; first appeared in the novel Dracula (1897)', 'A Transylvanian vampire count who transforms into a bat, controls wolves and hypnotises victims', 'Sleeps in a coffin of Transylvanian soil; must drink human blood to survive; killed by a stake through the heart', 'Based partly on Vlad III "the Impaler," the 15th-century Prince of Wallachia famous for impaling enemies', 'The definitive vampire in Western culture; influenced virtually every vampire story, film and TV show since'] },
    { secret: 'Tarzan', hint: 'A British nobleman raised by apes in the African jungle', facts: ['Created by Edgar Rice Burroughs; first appeared in The All-Story magazine in 1912', 'Full name John Clayton, Lord Greystoke — a British aristocrat\'s infant son orphaned in the African jungle and raised by apes', 'Learned to communicate with jungle animals, swing on vines and became physically extraordinary', 'Eventually discovers his human heritage and navigates both the jungle world and European civilisation', 'One of fiction\'s most enduring characters; over 70 Tarzan films have been made, making him one of cinema\'s most-portrayed characters'] },
    { secret: 'Mickey Mouse', hint: 'Walt Disney\'s iconic cartoon mouse, first star of a talking cartoon', facts: ['Created by Walt Disney and Ub Iwerks; first appeared in Steamboat Willie in 1928 — one of the first cartoons with synchronised sound', 'The mascot and icon of The Walt Disney Company; his image generates billions in merchandise annually', 'Originally named "Mortimer Mouse" by Walt Disney — his wife Lillian suggested "Mickey" instead', 'His distinctive red shorts, white gloves, yellow shoes and round ears are among the world\'s most recognised symbols', 'His Sorcerer\'s Apprentice sequence in Fantasia (1940) is considered one of animation\'s greatest moments'] },
    { secret: 'Tom and Jerry', hint: 'A cat and mouse in an endless cartoon chase', facts: ['A series of animated comedy shorts featuring a cat (Tom) and mouse (Jerry) in constant pursuit', 'Created by William Hanna and Joseph Barbera at MGM studios; first cartoon released in 1940', 'Won seven Academy Awards for Animated Short Film — more than any other cartoon series', 'Famous for slapstick violence — anvils, explosions, outrageous chases — with no dialogue, only music and sound effects', 'The series has run in some form for over 80 years and is still watched by children worldwide'] },
    { secret: 'Shrek', hint: 'A loveable green ogre who lives in a swamp', facts: ['An animated film character created by DreamWorks Animation; based on a 1990 picture book by William Steig', 'A green-skinned ogre who lives alone in a swamp and reluctantly rescues a princess', 'Shrek (2001) was the first animated film to win the Academy Award for Best Animated Feature', 'Famous for subverting fairytale conventions — the princess is not rescued by a handsome prince', 'Mike Myers voices Shrek; Eddie Murphy voices his beloved companion Donkey'] },
    { secret: 'Snow White', hint: 'Disney\'s first princess, poisoned by an apple', facts: ['The first Disney feature-length animated film, Snow White and the Seven Dwarfs, released 21 December 1937', 'Based on the Brothers Grimm fairy tale (1812); Snow White is a princess forced to flee a jealous queen', 'The Evil Queen poisons Snow White with an apple, putting her into a death-like sleep until a prince\'s kiss awakens her', 'Walt Disney bet everything on the film — critics called it "Disney\'s Folly" before release; it became the highest-grossing film of 1938', 'Snow White was the first Disney Princess; recognisable by her short black hair, red headband and yellow-blue-white dress'] },
    { secret: 'Cinderella', hint: 'A princess rescued by her Fairy Godmother\'s magic and a glass slipper', facts: ['Most famously adapted by Disney in 1950; based on Charles Perrault\'s story (1697) and earlier versions', 'An orphaned girl treated as a servant by her stepmother and stepsisters; helped by her Fairy Godmother to attend a royal ball', 'Transformed by magic for one night: pumpkin becomes carriage, rags become a ball gown, she wears glass slippers', 'Must leave by midnight when the magic expires; loses her glass slipper, by which the prince identifies her', 'One of the world\'s most widespread fairytales — versions of the Cinderella story exist in over 500 cultures worldwide'] },
    { secret: 'Sleeping Beauty', hint: 'A princess cursed to sleep until awakened by true love', facts: ['Based on fairytales by Charles Perrault (1697) and the Brothers Grimm; famously adapted by Disney in 1959', 'Princess Aurora is cursed at birth by the wicked fairy Maleficent to prick her finger on a spinning wheel and sleep forever', 'A good fairy partially counters the curse — instead of death, Aurora sleeps until awakened by true love\'s kiss', 'Disney\'s most elaborately animated film; it nearly bankrupted the studio due to its immense cost', 'Maleficent is often cited as one of the greatest villains in animation history'] },
    { secret: 'Astro Boy', hint: 'A robot boy superhero and founding icon of anime', facts: ['Created by Japanese manga artist Osamu Tezuka; first published in Shōnen magazine in 1952', 'A powerful android boy built by scientist Dr Tenma to replace his deceased son', 'Has jet-powered flight, superhuman strength, X-ray eyes, and a machine-gun built into his body', 'Considered the foundational figure of the manga and anime industry — Tezuka is called "the God of Manga"', 'Astro Boy\'s visual style — big eyes, expressive face — influenced virtually all subsequent anime and manga'] },
    { secret: 'Mulan', hint: 'A young Chinese woman who disguised herself as a soldier', facts: ['Based on the ancient Chinese legend of Hua Mulan, possibly from a 4th–6th century poem called the Ballad of Mulan', 'A young Chinese woman who disguises herself as a man to take her elderly father\'s place in the imperial army', 'Disney\'s Mulan (1998) made the story globally famous and became a major hit', 'In the original ballad, Mulan fights for 12 years and is offered a government position but chooses to return home', 'A global symbol of female bravery, family devotion and defying gender expectations'] },
    { secret: 'Sinbad the Sailor', hint: 'A legendary Arab seafarer of seven epic voyages', facts: ['A fictional sailor from the One Thousand and One Nights (Arabian Nights) stories', 'Makes seven epic voyages from Basra (Iraq), encountering giant rocs, sea monsters and a magnetic mountain', 'His adventures mix wonder, danger and moral lessons about greed, perseverance and faith', 'Likely inspired by real Arab and Persian maritime trade and exploration in the Indian Ocean', 'A universal symbol of maritime adventure and storytelling; inspired numerous films and cartoons'] },
    { secret: 'Princess Jasmine', hint: 'A spirited Disney princess who refuses to be treated as a prize', facts: ['A fictional princess in Disney\'s Aladdin (1992), based on a character in One Thousand and One Nights', 'A spirited, independent princess who refuses to be given away in marriage against her will', 'Falls in love with street thief Aladdin, who uses a magic lamp to try to win her hand', 'Her pet tiger Rajah is her loyal companion; recognisable by her turquoise outfit and long black hair', 'In the 2019 live-action remake, her character aspires to become Sultan and lead her own kingdom'] },
    { secret: 'Aladdin', hint: 'A street thief who finds a lamp containing a Genie', facts: ['A fictional young man from One Thousand and One Nights; popularised by Disney\'s 1992 animated film', 'A clever street thief from Agrabah who discovers a magic lamp containing a powerful Genie granting three wishes', 'Uses the wishes to win a princess, gain wealth and defeat the power-hungry villain Jafar', 'His flying carpet and the Genie (voiced memorably by Robin Williams in 1992) are iconic', 'In the original Arabian Nights story, Aladdin is a Chinese boy — Disney\'s version is set in an Arabian city'] },
    { secret: 'Popeye', hint: 'A one-eyed sailor who gets super-strength from spinach', facts: ['Created by E.C. Segar; first appeared in the Thimble Theatre comic strip on 17 January 1929', 'A one-eyed sailor with massive forearms who gains superhuman strength by eating canned spinach', 'Battles his rival Bluto (or Brutus) for the affections of his girlfriend Olive Oyl', 'Famous catchphrase: "I yam what I yam, and that\'s all that I yam"', 'Such was his cultural impact that spinach consumption in the US increased 33% during the Great Depression because of Popeye\'s influence'] },
    { secret: 'Pied Piper of Hamelin', hint: 'A mysterious piper who led rats — then children — out of a town', facts: ['A legendary figure from a medieval German folk tale, first recorded in the town of Hamelin around 1300 AD', 'A mysterious piper who uses magical pipe music to lead a plague of rats out of the town and into a river', 'When the townspeople refuse to pay him, he returns and plays a different tune — leading all the children away forever', 'Historians believe the tale contains a folk memory of a real historical event — possibly a mass migration or death of children', 'The "Pied Piper" is now a metaphor for a charismatic leader who lures followers with the power of persuasion'] },
    { secret: 'Hercules', hint: 'The mightiest hero of Greek mythology, famous for his Twelve Labours', facts: ['The greatest hero and strongest mortal in Greek mythology; the son of god Zeus and mortal woman Alcmene', 'Famous for completing the Twelve Labours — seemingly impossible tasks set as punishment for killing his own family in a fit of madness sent by the goddess Hera', 'Labours included slaying the Nemean Lion, killing the Hydra, capturing the Cerynitian Hind and cleaning the Augean Stables', 'In Roman mythology he is known as Hercules; in Greek he is Heracles', 'Disney\'s animated film Hercules (1997) introduced his myth to a new generation, though it greatly simplified the original Greek stories'] },
    { secret: 'Odysseus', hint: 'The clever Greek hero of Homer\'s epic who took 10 years to sail home from Troy', facts: ['The hero of Homer\'s Odyssey — one of the two great foundational epics of Western literature', 'King of the island of Ithaca and one of the key Greek heroes in the Trojan War; famous for his cunning rather than pure strength', 'His 10-year voyage home from Troy after the war included encounters with the Cyclops Polyphemus, the Sirens, the sorceress Circe and a six-headed monster Scylla', 'Guided by the goddess Athena throughout his journey; his faithful wife Penelope waited for him, weaving and unravelling a tapestry to delay suitors', 'In Roman mythology he is known as Ulysses; his name has become a universal symbol of the long, difficult journey home'] },
    { secret: 'Achilles', hint: 'The greatest Greek warrior of the Trojan War, invulnerable except for one heel', facts: ['The mightiest Greek warrior in Homer\'s Iliad and the central figure of the Trojan War myth', 'His mother Thetis dipped him as a baby in the River Styx to make him invulnerable — but held him by the heel, which remained mortal', 'Withdrew from battle after a quarrel with King Agamemnon over the captive Briseis, nearly causing the Greeks to lose the war', 'Returned to battle after his beloved companion Patroclus was killed by the Trojan hero Hector; he slew Hector in revenge', 'Was killed by an arrow to his heel shot by Paris, guided by the god Apollo — giving us the term "Achilles heel" for a fatal weakness'] },
    { secret: 'Robin Hood', hint: 'The English outlaw who robbed the rich to give to the poor', facts: ['A legendary English outlaw and skilled archer who, according to legend, lived in Sherwood Forest in Nottinghamshire', 'Famous for robbing from the rich to give to the poor, opposing the corrupt Sheriff of Nottingham and Prince John', 'His band of followers — the Merry Men — includes Little John, Friar Tuck, Much the Miller\'s Son and his love, Maid Marian', 'The earliest written references to Robin Hood appear in 14th-century poems; whether a real historical figure existed is debated', 'Has been portrayed in countless films and TV series; the 1991 film Robin Hood: Prince of Thieves starred Kevin Costner'] },
    { secret: 'Don Quixote', hint: 'A deluded Spanish knight who charges at windmills believing them to be giants', facts: ['The hero of Miguel de Cervantes\' Don Quixote (1605–1615) — often called the first modern novel and one of the greatest works of fiction ever written', 'A country gentleman who reads so many chivalric romances he loses his mind, renames himself Don Quixote and sets out as a knight errant', 'Famous for charging at windmills, convinced they are giants — giving us the phrase "tilting at windmills" to mean fighting imaginary enemies', 'Accompanied by his devoted, practical squire Sancho Panza — the comic contrast between the two is one of literature\'s great double acts', 'Don Quixote is the most translated book after the Bible; it has shaped the entire tradition of the Western novel'] },
    { secret: 'Frankenstein\'s Monster', hint: 'A creature created by a scientist and brought to life in a famous gothic novel', facts: ['Created by Mary Shelley in her novel Frankenstein, or The Modern Prometheus (1818), written when Shelley was just 18', 'The creature is assembled by the scientist Victor Frankenstein from body parts and brought to life using electricity during a thunderstorm', 'In the novel the creature is intelligent, articulate and philosophical — not the mute, lumbering figure of popular culture', 'The creature is nameless in the novel; the monster is often incorrectly called "Frankenstein" — that is the scientist\'s name, not the creation\'s', 'Considered the first work of science fiction; its themes of scientific hubris, creation and responsibility remain profoundly relevant'] },
    { secret: 'The Phantom of the Opera', hint: 'A masked musical genius who haunts a Paris opera house', facts: ['The mysterious, disfigured musical genius who lives beneath the Paris Opéra in Gaston Leroux\'s novel Le Fantôme de l\'Opéra (1910)', 'Obsessively in love with the soprano Christine Daaé, whom he tutors secretly, believing himself to be the "Angel of Music" sent to guide her', 'Lives in an elaborate underground lair beneath the Paris Opéra, accessible via secret passages and a subterranean lake', 'Andrew Lloyd Webber\'s 1986 musical adaptation became the longest-running show in Broadway history, with over 35 years of consecutive performances', 'The Phantom\'s half-masked face — disfigured on one side — is one of the most iconic images in theatrical history'] },
    { secret: 'Ebenezer Scrooge', hint: 'The miser transformed by three ghosts in a classic Christmas tale', facts: ['The central character of Charles Dickens\' A Christmas Carol (1843) — one of the most-read short novels in English', 'A cold, miserly businessman who despises Christmas and begrudges his clerk Bob Cratchit every lump of coal', 'Visited on Christmas Eve by three spirits: the Ghosts of Christmas Past, Present and Yet to Come', 'Transformed by what he sees — most chillingly his own neglected grave — into a generous, joyful benefactor', 'The name "Scrooge" has entered the English language as a common noun meaning a miser or tight-fisted person'] },
    { secret: 'Hamlet', hint: 'Shakespeare\'s brooding Danish prince who asks "To be or not to be"', facts: ['The tragic hero of William Shakespeare\'s Hamlet (c.1600–1601) — perhaps the most performed, analysed and quoted play in history', 'Prince of Denmark who is visited by the ghost of his murdered father and commanded to take revenge on his uncle Claudius, now king', 'Famous for his philosophical introspection, summarised in the "To be or not to be" soliloquy on the merits of existence', 'Delays his revenge for most of the play, leading to a catastrophic final act in which nearly all the main characters die', 'Goethe called him "a lovely, pure and most moral nature" crushed by a duty he cannot fulfil; the play spawned a vast literary tradition of psychological drama'] },
    { secret: 'Hermione Granger', hint: 'Harry Potter\'s brilliant, rule-following best friend who saves the day with knowledge', facts: ['A central character in J.K. Rowling\'s Harry Potter series (1997–2007); Harry Potter\'s best friend alongside Ron Weasley', 'A witch of exceptional talent and intelligence — the brightest student in her year at Hogwarts, sorted into Gryffindor house', 'Her magical knowledge and preparation repeatedly saves Harry and Ron from danger; described as "the most brilliant witch of her age"', 'Born to non-magical parents (a "Mudblood" in Death Eater language), her success challenges the wizarding world\'s prejudice against those of non-magical birth', 'Played by Emma Watson in all eight Harry Potter films; Rowling has said Hermione is in many ways based on her younger self'] },
    { secret: 'Frodo Baggins', hint: 'The hobbit who carried the One Ring across Middle-earth to destroy it', facts: ['The central hero of J.R.R. Tolkien\'s The Lord of the Rings (1954–55); a hobbit of the Shire', 'Inherits the One Ring from his uncle Bilbo Baggins and is tasked by the wizard Gandalf with destroying it in the fires of Mount Doom', 'Sets out from the Shire with eight companions in the Fellowship of the Ring; most of the quest is completed alone with his faithful friend Samwise Gamgee', 'The Ring grows heavier as the quest progresses, corrupting Frodo\'s will; it is ultimately destroyed through the treachery of Gollum, not Frodo\'s choice', 'His character explores themes of the burden of responsibility, the corrupting power of evil, and the importance of ordinary virtue over heroic grandeur'] },
    { secret: 'Voldemort', hint: 'The dark wizard so feared in Harry Potter that few dare speak his name', facts: ['The primary antagonist of J.K. Rowling\'s Harry Potter series; born Tom Marvolo Riddle to a witch mother and Muggle (non-magical) father', 'The most powerful Dark Wizard in the wizarding world\'s history; created seven Horcruxes to make himself effectively immortal', 'So feared that most wizards refer to him only as "He-Who-Must-Not-Be-Named" or "You-Know-Who"; only Harry and Dumbledore routinely say "Voldemort"', 'His attempt to kill the infant Harry Potter failed mysteriously due to Lily Potter\'s self-sacrificial love, leaving Harry with a scar and Voldemort temporarily destroyed', 'The anagram "Tom Marvolo Riddle" rearranges to "I am Lord Voldemort" — a Rowling detail beloved by fans'] },
    { secret: 'Katniss Everdeen', hint: 'The teenage archer who became the reluctant face of a revolution in The Hunger Games', facts: ['The protagonist of Suzanne Collins\' The Hunger Games trilogy (2008–2010); a 16-year-old hunter from the impoverished District 12', 'Volunteers for the brutal Hunger Games — a televised fight to the death — in place of her younger sister Prim', 'Her defiance in the Games — threatening a double suicide with Peeta to deny the Capitol a winner — sparks a broader revolution', 'Becomes the symbol of the rebellion: the "Mockingjay," whose image appears on revolutionary propaganda across the districts', 'One of fiction\'s most influential modern heroines; the trilogy sold over 100 million copies and spawned a major film franchise'] },
    { secret: 'Daenerys Targaryen', hint: 'The dragon queen who reclaims her family\'s iron throne in Game of Thrones', facts: ['A central character in George R.R. Martin\'s A Song of Ice and Fire novels and HBO\'s Game of Thrones (2011–2019)', 'Last surviving member of House Targaryen; spent her early life in exile before building an army and three dragons', 'Styled the "Mother of Dragons," "Breaker of Chains" and "Khaleesi" (queen of the Dothraki horselords)', 'Her dragons — Drogon, Rhaegal and Viserion — are the first in the world for over a century, providing her with a decisive military advantage', 'One of the most-discussed fictional characters of the 2010s; her final season arc was one of the most debated in television history'] },
    { secret: 'Walter White', hint: 'The chemistry teacher who became a drug kingpin in Breaking Bad', facts: ['The protagonist of the AMC drama Breaking Bad (2008–2013), played by Bryan Cranston', 'A mild-mannered high school chemistry teacher in Albuquerque, New Mexico, who is diagnosed with terminal lung cancer', 'Begins cooking high-purity methamphetamine with former student Jesse Pinkman to secure his family\'s financial future', 'His transformation from victim to ruthless criminal mastermind — under the alias "Heisenberg" — is one of television\'s greatest character arcs', 'Breaking Bad is widely regarded as one of the greatest television dramas ever made; Bryan Cranston won the Emmy for Outstanding Lead Actor Drama four times'] },
    { secret: 'Jay Gatsby', hint: 'The mysterious millionaire who throws lavish parties to win back his lost love', facts: ['The enigmatic protagonist of F. Scott Fitzgerald\'s The Great Gatsby (1925) — one of the great American novels', 'A fabulously wealthy man of mysterious origins who throws extravagant parties at his West Egg mansion every weekend', 'Secretly pines for Daisy Buchanan, the married woman he loved before WWI before losing her to a richer man', 'His wealth was accumulated through bootlegging during Prohibition; his dream of recapturing the past with Daisy is ultimately doomed', 'A defining symbol of the American Dream and its corruption; his famous green light across the bay is one of literature\'s most analysed symbols'] },
    { secret: 'Peter Pan', hint: 'The boy who never grew up and flew to Neverland', facts: ['Created by Scottish playwright J.M. Barrie; first appeared in the play The Little White Bird (1902) and the famous play Peter Pan (1904)', 'A boy who never ages and lives in Neverland with the Lost Boys, fairies and mermaids, battling the pirate Captain Hook', 'Came to the real world and taught Wendy, John and Michael Darling to fly using pixie dust, then took them to Neverland', 'His fairy companion Tinker Bell is one of the most recognisable fictional characters in history; she became the icon of The Walt Disney Company', 'J.M. Barrie donated the copyright to Great Ormond Street Hospital in London, which continues to receive royalties for Peter Pan performances'] },
    { secret: 'Alice (in Wonderland)', hint: 'The curious girl who fell down a rabbit hole into a world of impossible logic', facts: ['The protagonist of Lewis Carroll\'s Alice\'s Adventures in Wonderland (1865) and Through the Looking-Glass (1871)', 'A curious, polite and sensible girl who falls down a rabbit hole and enters a fantastical world populated by bizarre characters', 'Encounters the White Rabbit, the Mad Hatter, the Cheshire Cat, the Queen of Hearts and Tweedledee and Tweedledum', 'The books were written by Charles Lutwidge Dodgson (pen name Lewis Carroll), a mathematics lecturer at Oxford University, for Alice Liddell — the real daughter of his college dean', 'One of the most adapted stories in history; Alice\'s Adventures in Wonderland has never been out of print since 1865 and has been translated into 174 languages'] },
    { secret: 'Simba', hint: 'The lion prince who must reclaim his kingdom in The Lion King', facts: ['The protagonist of Disney\'s The Lion King (1994) — the highest-grossing traditionally animated film of all time', 'A young lion cub, prince of the Pride Lands, whose father Mufasa is killed by his villainous uncle Scar', 'Flees in guilt and self-imposed exile but ultimately returns to claim his rightful place as king', 'The story is widely recognised as loosely based on Shakespeare\'s Hamlet — the murdered father, scheming uncle, and reluctant son', 'The Lion King (1994) won two Academy Awards; its 1994 Broadway musical version has run for over 25 years, becoming one of the longest-running shows in Broadway history'] },
    { secret: 'Pinocchio', hint: 'The wooden puppet whose nose grows when he lies', facts: ['A wooden puppet created by the carpenter Geppetto in Carlo Collodi\'s Italian novel The Adventures of Pinocchio (1883)', 'Comes to life and longs to become a real boy; guided (often ignored) by a talking cricket called Jiminy Cricket in Disney\'s adaptation', 'His nose grows longer whenever he tells a lie — one of the most universally recognised fictional metaphors in existence', 'Goes through a series of adventures and moral tests before the Blue Fairy grants his wish and makes him a real boy', 'Disney\'s 1940 adaptation won two Academy Awards; Pinocchio\'s lie-detecting nose has become a universal cultural reference for dishonesty'] },
    { secret: 'Wonder Woman', hint: 'DC\'s Amazonian superhero princess who fights for truth and justice', facts: ['Created by psychologist William Moulton Marston and artist H.G. Peter; first appeared in All Star Comics #8 in October 1941', 'Princess Diana of Themyscira — an Amazon warrior from a hidden island of immortal women warriors — who enters the world of men to fight evil', 'Powers include superhuman strength, speed and durability; wields a magic lasso of truth that compels honesty, plus indestructible bracelets and a tiara', 'One of the first female superheroes and one of the most enduring; she has been in continuous publication since 1941', 'Gal Gadot\'s portrayal in the DC Extended Universe (2017 film) was both a critical and commercial success, grossing over $800 million worldwide'] },
    { secret: 'The Joker', hint: 'Batman\'s anarchic, face-painted arch-nemesis in Gotham City', facts: ['Batman\'s most iconic villain, first appearing in Batman #1 (April 1940); created by Bill Finger, Bob Kane and Jerry Robinson', 'A criminal mastermind with clown-like white face paint, green hair and a permanent grin; no consistent origin story — he prefers his past to be "multiple choice"', 'Represents chaos and anarchy as the philosophical antithesis to Batman\'s order and justice', 'Played on screen by Cesar Romero (1966), Jack Nicholson (1989), Heath Ledger (2008) and Joaquin Phoenix (2019) — each iconic in different ways', 'Heath Ledger\'s posthumous Academy Award win for The Dark Knight (2008) remains one of cinema\'s most emotional Oscar moments'] },
    { secret: 'Wolverine', hint: 'The cigar-chomping Marvel mutant with regenerating flesh and retractable metal claws', facts: ['A Marvel Comics superhero; created by Roy Thomas, Len Wein and John Romita Sr.; first appeared in Incredible Hulk #181 (1974)', 'Real name James Howlett (also known as Logan); a mutant with a regenerative healing factor, enhanced senses and retractable bone claws coated in the fictional metal adamantium', 'A member of the X-Men; his tragic backstory involves centuries of conflict, amnesia and loss due to his near-immortality', 'Hugh Jackman played the character in 17 films from 2000 to 2024 — one of cinema\'s longest runs in a superhero role', 'The film Logan (2017) — a dark, character-driven story of an ageing Wolverine — is widely regarded as one of the best superhero films ever made'] },
    { secret: 'Winnie the Pooh', hint: 'The honey-obsessed bear from the Hundred Acre Wood', facts: ['Created by A.A. Milne; first appeared in the book Winnie-the-Pooh (1926), inspired by Milne\'s son Christopher Robin\'s stuffed bear', 'A gentle, honey-obsessed bear who lives in the Hundred Acre Wood with friends Piglet, Eeyore, Tigger and Kanga', 'The original bear toy was based on a real bear named Winnie — a Canadian black bear who lived in London Zoo and was beloved by soldiers in WWI', 'Disney acquired the rights in 1966; Disney\'s animated Pooh became an enormously successful franchise — one of Disney\'s highest-earning properties', 'Pooh and friends are licensed extensively in China — ironically, the character was banned in China after 2018 due to internet memes comparing Pooh\'s appearance to President Xi Jinping'] },
    { secret: 'Long John Silver', hint: 'The cunning, one-legged pirate of Treasure Island', facts: ['The charismatic, one-legged pirate cook in Robert Louis Stevenson\'s Treasure Island (1883) — one of the most influential adventure novels ever written', 'Sailed aboard the Hispaniola as ship\'s cook; secretly he is the leader of a pirate mutiny, though he maintains a charming, avuncular demeanour', 'His pet parrot, Captain Flint (named after a fearsome pirate captain), sits on his shoulder and cries "Pieces of eight!"', 'A moral ambiguity rare in Victorian fiction — Silver is genuinely likeable and protective of the boy narrator Jim Hawkins, even while plotting treachery', 'Stevenson based Silver partly on his friend W.E. Henley, a poet who had lost a leg below the knee; Henley is also the source of the poem Invictus'] },
    { secret: 'Dr Jekyll and Mr Hyde', hint: 'A respectable doctor whose potion unleashes a terrifying alter ego', facts: ['The dual protagonist of Robert Louis Stevenson\'s Strange Case of Dr Jekyll and Mr Hyde (1886) — a novella that defined the literary theme of duality', 'Dr Henry Jekyll is a respectable London physician who drinks a potion that transforms him into the smaller, brutish, evil Edward Hyde', 'Hyde commits acts of violence Jekyll would never countenance; the transformation becomes harder to reverse as Hyde grows stronger', 'The story is an allegory for the duality of human nature — the civilised self and the repressed, darker impulses beneath', '"Jekyll and Hyde" is now a common phrase for someone with a split personality or extreme mood swings; the story has been adapted into countless films, plays and musicals'] },
    { secret: 'Forrest Gump', hint: 'A kind-hearted man from Alabama who accidentally witnesses and shapes American history', facts: ['The fictional protagonist of Winston Groom\'s 1986 novel, made famous by Robert Zemeckis\'s 1994 film starring Tom Hanks', 'Despite a low IQ, Forrest excels at football, serves heroically in Vietnam, becomes a ping-pong champion, and founds a shrimping business — all through good fortune and simple sincerity', 'Famous lines include "Life is like a box of chocolates — you never know what you\'re gonna get" and "Run, Forrest, run!"', 'The film won six Academy Awards including Best Picture, Best Director and Best Actor for Tom Hanks', 'Forrest\'s journey intersects with real historical events — Elvis Presley, John F. Kennedy, Watergate, the Vietnam War and the moon landing'] },
    { secret: 'Hannibal Lecter', hint: 'A brilliant psychiatrist and cannibalistic serial killer who helps catch other murderers', facts: ['Created by author Thomas Harris; first appeared in the novel Red Dragon (1981)', 'A brilliant psychiatrist and gourmet who is also a cannibalistic serial killer — his cultured, charming exterior masks a monster beneath', 'Imprisoned in a high-security asylum for the criminally insane; consulted by FBI agents hunting other killers', 'Anthony Hopkins\'s portrayal in The Silence of the Lambs (1991) won the Academy Award for Best Actor despite only 16 minutes of screen time — one of the shortest winning performances in Oscar history', '"A census taker once tried to test me. I ate his liver with some fava beans and a nice Chianti" — one of cinema\'s most chilling lines'] },
    { secret: 'Zorro', hint: 'A masked swordsman who defends the poor against tyranny in old California', facts: ['A fictional masked vigilante created by Johnston McCulley; first appeared in the story The Curse of Capistrano (1919)', 'Don Diego de la Vega — a nobleman who disguises himself as the black-masked, sword-fighting Zorro to fight injustice in colonial California', 'Zorro means "fox" in Spanish; he is known for his signature move — carving a "Z" with his sword on walls, doors and the clothes of his enemies', 'One of the earliest masked superhero characters in popular culture; directly inspired Bob Kane\'s creation of Batman', 'Has been played by Douglas Fairbanks (1920), Tyrone Power (1940), Guy Williams (TV, 1957–59) and Antonio Banderas (1998)'] },
    { secret: 'Count of Monte Cristo', hint: 'A wrongly imprisoned man who escapes to take elaborate revenge on his betrayers', facts: ['The protagonist of Alexandre Dumas\'s The Count of Monte Cristo (1844) — one of the most beloved adventure novels in history', 'Edmond Dantès — a young French sailor wrongly imprisoned in the Château d\'If for 13 years on a false treason charge', 'In prison he is tutored by a wise old priest who reveals the location of a vast fortune on the island of Monte Cristo', 'Escapes from prison by switching places with the priest\'s body; uses the treasure to transform himself into the mysterious "Count of Monte Cristo"', 'Systematically and brilliantly destroys the three men who betrayed him, all while maintaining his noble disguise; a definitive revenge fantasy'] },
    { secret: 'Sherlock\'s Nemesis (Professor Moriarty)', hint: 'The "Napoleon of Crime" who is Sherlock Holmes\'s equal in intellect and evil', facts: ['James Moriarty — the master criminal and arch-nemesis of Sherlock Holmes in Arthur Conan Doyle\'s stories', 'A mathematics professor of brilliant intellect who runs a vast criminal empire from the shadows, never leaving traceable evidence', 'Described by Holmes as "the Napoleon of Crime" — as powerful in the criminal world as Napoleon was in the political sphere', 'Appeared in only two stories in Doyle\'s original canon, but became one of fiction\'s most enduring villains through adaptations', 'Holmes and Moriarty seemingly both die at the Reichenbach Falls in "The Final Problem" (1893) — public outrage forced Doyle to resurrect Holmes in 1903'] },
    { secret: 'Dr Watson', hint: 'Sherlock Holmes\'s loyal friend, chronicler and fellow detective', facts: ['Dr John H. Watson — a retired British Army surgeon and the devoted companion of Sherlock Holmes in Arthur Conan Doyle\'s stories', 'Narrates nearly all the Holmes stories; his accounts are presented as published memoirs of his adventures with Holmes', 'Met Holmes when both needed to share lodgings at 221B Baker Street; Watson moved in and the partnership began', 'Often underestimated — Watson is brave, loyal and a capable doctor; Holmes relies on him as a sounding board and companion in danger', 'One of fiction\'s greatest "sidekicks"; the Holmes–Watson dynamic has been endlessly imitated and is the template for the detective-companion genre'] },
    { secret: 'Captain Nemo', hint: 'The mysterious commander of an extraordinary submarine who roams the ocean depths', facts: ['Created by Jules Verne; first appeared in Twenty Thousand Leagues Under the Sea (1870) and later in The Mysterious Island (1874)', 'A brilliant, brooding inventor and commander of the Nautilus — an advanced submarine decades ahead of its time', 'In Twenty Thousand Leagues he is an enigmatic man of the sea harbouring a deep hatred of oppressive nations', 'Later revealed in The Mysterious Island to be Prince Dakkar — an Indian prince who turned against imperialism after a failed uprising', 'His name means "No one" in Latin — a deliberate choice reflecting his desire to be unknown to the world he has rejected'] },
    { secret: 'Black Panther', hint: 'The king of Wakanda and Marvel\'s first Black superhero', facts: ['Created by Stan Lee and Jack Kirby; first appeared in Fantastic Four #52 in July 1966 — the first Black superhero in mainstream American comics', 'Real name T\'Challa — the king and protector of Wakanda, a fictional African nation of immense technological advancement powered by the rare metal Vibranium', 'As Black Panther, T\'Challa wears a suit of Vibranium-woven armour and possesses enhanced strength, speed and senses from the Heart-Shaped Herb', 'The 2018 film Black Panther became a cultural phenomenon, grossing over $1.3 billion worldwide and winning three Academy Awards — the first superhero film nominated for Best Picture', 'Chadwick Boseman\'s portrayal was celebrated worldwide; his death from cancer in 2020 led to an outpouring of grief — he had filmed the role while privately undergoing treatment'] },
    { secret: 'Luke Skywalker', hint: 'The young farm boy from Tatooine who becomes a Jedi and defeats the Empire', facts: ['The protagonist of the original Star Wars trilogy (1977–1983), created by George Lucas', 'A farm boy on the desert planet Tatooine who discovers his destiny as a Jedi Knight and joins the Rebel Alliance', 'Trained by Jedi Masters Obi-Wan Kenobi and Yoda; learns that the villain Darth Vader is his father — one of cinema\'s greatest twists', 'Destroys the Death Star in A New Hope using the Force rather than targeting computers — establishing him as the Rebellion\'s hero', 'Mark Hamill\'s portrayal across six decades of Star Wars films makes Luke one of cinema\'s most enduring heroes'] },
    { secret: 'Princess Leia', hint: 'The rebel princess who leads the fight against the Galactic Empire in Star Wars', facts: ['A central character in the Star Wars original trilogy (1977–1983), created by George Lucas; played by Carrie Fisher', 'A princess of Alderaan and a leader of the Rebel Alliance against the tyrannical Galactic Empire', 'Famous for her distinctive double-bun hairstyle; later revealed to be the twin sister of Luke Skywalker and daughter of Darth Vader', 'Sends the Death Star plans hidden in R2-D2 with the message "Help me, Obi-Wan Kenobi — you\'re my only hope"', 'Carrie Fisher\'s performance made Leia one of cinema\'s most beloved heroines; after Fisher\'s death in 2016, she was honoured by being made a Disney Legend'] },
    { secret: 'Spock', hint: 'The half-human half-Vulcan science officer of the USS Enterprise', facts: ['A central character in Star Trek, created by Gene Roddenberry; first appeared in the original series pilot in 1965', 'Half-human, half-Vulcan — torn between his logical Vulcan heritage and his human emotions; he typically suppresses the latter', 'Chief Science Officer and First Officer of the USS Enterprise under Captain Kirk; his Vulcan logic often clashes with Dr McCoy\'s emotion and intuition', 'Famous for the Vulcan salute (split-fingered hand gesture) and the phrase "Live long and prosper" — both invented by actor Leonard Nimoy, who based the salute on a Jewish priestly blessing', 'The Spock–Kirk friendship — the logical and the intuitive working in harmony — is one of science fiction\'s defining relationships'] },
    { secret: 'Captain Kirk', hint: 'The bold and charismatic captain of the starship Enterprise in Star Trek', facts: ['James Tiberius Kirk — the captain of the USS Enterprise in Gene Roddenberry\'s Star Trek original series (1966–1969)', 'A daring, intuitive leader known for bending rules, charming aliens and finding unconventional solutions — the opposite of Spock\'s pure logic', 'Born in Riverside, Iowa; the youngest captain in Starfleet history at the time of his command', 'Famous catchphrase: "Beam me up, Scotty" — though this exact phrase was never said in the original series', 'William Shatner\'s iconic portrayal defined the character; Kirk later appeared in seven feature films and remains the template for the bold, maverick starship captain'] },
    { secret: 'Donald Duck', hint: 'Mickey Mouse\'s hot-tempered, sailor-suited duck companion', facts: ['Created by Walt Disney; first appeared in The Wise Little Hen on 9 June 1934 — now celebrated as Donald Duck Day', 'A short-tempered, accident-prone duck who wears a sailor suit and cap; his explosive tantrums are his most beloved characteristic', 'His distinctive speech — a garbled, nasal quack — was voiced by Clarence "Ducky" Nash for 50 years, then by Tony Anselmo', 'Has three nephews — Huey, Dewey and Louie — and a wealthy Uncle Scrooge McDuck, who starred in the DuckTales animated series', 'Donald Duck actually has more comic book appearances than any other Disney character — possibly more than any character in comics history'] },
    { secret: 'Goofy', hint: 'Mickey Mouse\'s loveable, clumsy and eternally optimistic dog friend', facts: ['A Disney character who first appeared as "Dippy Dawg" in Mickey\'s Revue in 1932; redesigned and renamed Goofy by 1934', 'An anthropomorphic dog and one of Mickey Mouse\'s best friends; known for his distinctive laugh and tendency to fall into absurd mishaps', 'Despite his clumsiness, Goofy is warm-hearted, enthusiastic and optimistic — the eternal amateur who always tries his best', 'The Goofy How To shorts (1940s–50s) — in which Goofy attempts various sports and activities — are considered classics of animation comedy', 'Has a son, Max Goof, who featured in A Goofy Movie (1995) — a beloved coming-of-age film about their strained father-son relationship'] },
    { secret: 'Bugs Bunny', hint: 'The wisecracking carrot-chomping rabbit of Looney Tunes', facts: ['Created by a team at Warner Bros. including Tex Avery and Chuck Jones; first fully appeared in A Wild Hare in 1940', 'A quick-witted, unflappable grey rabbit who outwits hunters, monsters and villains with cool sarcasm and clever tricks', 'Famous catchphrase: "Eh, what\'s up, Doc?" — delivered while casually chomping a carrot, which Mel Blanc always had to spit out after each take', 'One of the most recognisable cartoon characters in history; the mascot of Warner Bros. and appeared in wartime propaganda films', 'Inducted into the Hollywood Walk of Fame in 1985 — one of very few animated characters to receive this honour'] },
    { secret: 'Scooby-Doo', hint: 'The talking Great Dane who solves mysteries with his teenage friends', facts: ['Created by CBS and Hanna-Barbera Productions; first appeared in Scooby-Doo, Where Are You! on 13 September 1969', 'A Great Dane with the ability to speak (in broken, Scooby-Doo-ish language) who travels with four teenagers — Fred, Daphne, Velma and Shaggy — solving mysteries', 'The mysteries always involve seemingly supernatural villains who are inevitably unmasked as humans in disguise with a criminal motive', 'Famous catchphrases: Scooby\'s "Scooby-Dooby-Doo!" and Shaggy\'s "Zoinks!"; Scooby and Shaggy are inseparable cowards who stumble into solving cases', 'One of the longest-running animated franchises in history; has appeared in over 13 original TV series, dozens of films and is still in production over 55 years later'] },
    { secret: 'SpongeBob SquarePants', hint: 'The enthusiastic sea sponge who flips Krabby Patties in an underwater city', facts: ['Created by marine science educator and animator Stephen Hillenburg; first aired on Nickelodeon on 1 May 1999', 'A cheerful, optimistic sea sponge who lives in a pineapple under the sea in the city of Bikini Bottom and works as a fry cook at the Krusty Krab restaurant', 'His best friend is the dim but loveable starfish Patrick Star; his neighbour is the grumpy squid Squidward Tentacles', 'SpongeBob SquarePants became one of the most successful animated franchises in history — over 13 seasons, films, a Broadway musical and merchandise generating billions', 'Creator Stephen Hillenburg, a marine biologist, insisted SpongeBob be a sea sponge, not a kitchen sponge, to reflect his love of marine life — though the rectangular design made him look like one anyway'] },
    { secret: 'Mr Bean', hint: 'Britain\'s beloved bumbling comedy character who rarely speaks', facts: ['Created and played by Rowan Atkinson; first appeared in the ITV series Mr Bean in January 1990', 'A childlike, self-centred and accident-prone man who rarely speaks, solving everyday situations through absurd and creative workarounds', 'His best friend is a small stuffed teddy bear; his nemesis is a three-wheeled Reliant Robin that he repeatedly sends crashing', 'The character was inspired partly by Jacques Tati\'s Monsieur Hulot and partly by Atkinson\'s own silent comedy work at Oxford', 'Mr Bean is one of the most globally successful comedy characters — the series has been sold to 245 territories and is particularly beloved in China, the Middle East and across Africa'] },
    { secret: 'Tintin', hint: 'The young Belgian reporter who travels the world solving mysteries with his fox terrier', facts: ['Created by Belgian cartoonist Hergé (Georges Remi); first appeared in Le Vingtième Siècle newspaper on 10 January 1929', 'A young, brave Belgian reporter who travels the world getting embroiled in adventures involving spies, smugglers and villains, accompanied by his fox terrier Snowy (Milou)', 'The series is famous for Hergé\'s ligne claire (clear line) art style and meticulous research into the real locations depicted', 'His companions include the explosive Captain Haddock, the brilliant but deaf Professor Calculus and the bumbling Thompsons', 'The Tintin albums have sold over 230 million copies in 70 languages — the second best-selling comics series in history after Superman'] },
    { secret: 'Little Red Riding Hood', hint: 'The girl in a red cape who encounters a wolf on the way to her grandmother\'s house', facts: ['One of the most ancient and widespread fairy tales in the world; the most famous version was written by Charles Perrault in 1697 and later retold by the Brothers Grimm in 1812', 'A young girl sent to deliver food to her sick grandmother; she meets a cunning wolf in the forest who races ahead, devours the grandmother and disguises himself as her', 'In Perrault\'s original the wolf eats the girl too — a cautionary ending with no rescue; the Brothers Grimm added the huntsman who saves them', 'Scholars believe the tale contains a very ancient warning about predatory strangers; versions of the story have been found across Europe and even in East Asia', 'One of the most retold and reinterpreted fairy tales in history — countless films, books and stage productions have reimagined it across every genre from horror to comedy'] },
    { secret: 'The Little Mermaid', hint: 'A mermaid princess who longs to be human and live on land', facts: ['Created by Danish author Hans Christian Andersen; published in 1837 as Den lille havfrue', 'A young mermaid princess who falls in love with a human prince and gives up her voice to a sea witch in exchange for human legs', 'In Andersen\'s original — far darker than the Disney version — she does not marry the prince; instead of killing him to regain her tail, she dissolves into sea foam at dawn', 'Disney\'s The Little Mermaid (1989) transformed the story into a happy ending and launched the Disney Renaissance — the most successful period in the studio\'s history since Walt Disney himself', 'Ariel\'s red hair and green tail are among the most iconic character designs in animation; the film\'s songs "Part of Your World" and "Under the Sea" won Academy Awards'] },
    { secret: 'Mowgli', hint: 'The boy raised by wolves in the jungles of India', facts: ['Created by Rudyard Kipling; appeared in The Jungle Book (1894) and The Second Jungle Book (1895)', 'An Indian boy abandoned as a baby in the jungle of central India and raised by a wolf pack; he learns the law of the jungle from his mentors Baloo the bear and Bagheera the panther', 'His most dangerous enemy is Shere Khan — a tiger who considers the "man-cub" an intruder in the jungle and hunts him relentlessly', 'Disney\'s animated The Jungle Book (1967) was the last film personally supervised by Walt Disney before his death; its jazz-influenced soundtrack became beloved worldwide', 'Mowgli is a symbol of the tension between the human and animal worlds, and of the question of where we truly belong'] },
    { secret: 'King Kong', hint: 'The giant ape captured from a mysterious island and brought to New York City', facts: ['Created by filmmaker Merian C. Cooper and novelist Edgar Wallace; first appeared in the 1933 film King Kong — one of the most influential films ever made', 'A gigantic ape living on the prehistoric Skull Island, worshipped as a god by native islanders', 'Captured by a film crew and brought to New York City for public exhibition; escapes and climbs the Empire State Building in the film\'s iconic finale', 'His famous attraction to actress Ann Darrow — the beauty who tamed the beast — gives the story its emotional core', 'The 1933 film pioneered stop-motion special effects; "Kong" has since appeared in multiple remakes and a shared cinematic universe with Godzilla'] },
    { secret: 'Berlin', hint: 'The charismatic, ruthless mastermind from Money Heist', facts: ['A fictional character in the Spanish heist thriller La Casa de Papel (Money Heist), created by Álex Pina; first aired on Antena 3 in 2017', 'Real name Andrés de Fonollosa — the older brother of the mysterious Professor and a brilliantly calculated criminal strategist', 'Played with hypnotic menace by Pedro Alonso; despite being cruel and morally ambiguous, he became one of the most beloved characters in the series', 'Dies heroically in the Season 2 finale, sacrificing himself to buy the gang time to escape — a death that devastated viewers worldwide', 'His popularity led to his own prequel spin-off series Berlin (2023), exploring his criminal exploits in Paris years before the Royal Mint heist'] },
    { secret: 'Ethan Hunt', hint: 'The seemingly impossible-mission-accepting IMF super-spy', facts: ['The protagonist of the Mission: Impossible franchise; created for the 1996 film as a reimagining of the 1966 TV series character', 'An Impossible Missions Force (IMF) agent who accepts missions that are, by definition, nearly impossible and always involves deep infiltration and identity deception', 'Played by Tom Cruise in all eight Mission: Impossible films (1996–present); Cruise performs many of his own death-defying stunts, including the famous HALO jump and Burj Khalifa climb', 'Famous for elaborate face-mask disguises, spectacular set-piece action sequences and the recurring self-destructing tape-recorded briefings', 'The franchise has grossed over $4 billion worldwide; the series is notable for escalating the stunt spectacle with each new film'] },
    { secret: 'Jack Reacher', hint: 'The drifting ex-military policeman who is a one-man army for the wrongly accused', facts: ['Created by British author Lee Child; first appeared in the novel Killing Floor (1997)', 'James "Jack" Reacher — a former US Army Military Police officer who drifts across America with no fixed address, no phone and no ties, carrying only a toothbrush', 'Stands 6\'5" and is a physically imposing, analytically precise fighter who dispenses brutal but fair justice to criminals who prey on the innocent', 'His minimalist lifestyle — no possessions, buying new clothes rather than washing old ones — is a deliberate rejection of the obligations of ordinary life', 'Tom Cruise played Reacher in two films (2012, 2016); Alan Ritchson\'s portrayal in the Amazon Prime Video series (2022–present) was widely praised as more faithful to the books'] },
    { secret: 'John Wick', hint: 'The legendary retired assassin dragged back into the underworld after a terrible loss', facts: ['The protagonist of the John Wick franchise; created by screenwriter Derek Kolstad; played by Keanu Reeves', 'A former legendary hitman known as "Baba Yaga" — the Boogeyman of the criminal underworld — who had retired for love', 'His return to violence is triggered by the murder of his puppy (a final gift from his dying wife) and theft of his vintage Mustang by the son of a Russian mob boss', 'The franchise redefined Hollywood action with its "gun-fu" combat style — a balletic blend of Brazilian jiu-jitsu, judo and tactical firearms that launched a new genre of choreographed gun-action', 'The four films (2014–2023) have grossed over $1 billion worldwide; Keanu Reeves trained intensively for each film, performing the vast majority of his own fight sequences'] },
    { secret: 'Lucifer', hint: 'The Devil who leaves Hell to run a nightclub in Los Angeles', facts: ['The character of Lucifer Morningstar was created by Neil Gaiman and Sam Kieth in DC/Vertigo comics; first appeared in Sandman #4 in 1989, later starring in his own series', 'The fallen angel and ruler of Hell who grows bored of his domain and retires to Los Angeles, where he opens a nightclub called Lux and consults with the LAPD', 'His supernatural gift is compelling humans to reveal their deepest desires with a look — a power he cannot turn off', 'The Fox/Netflix TV series Lucifer (2016–2021), starring Tom Ellis, reimagined the character as a suave, charming, self-obsessed immortal with unexpected vulnerability and a heart', 'The show became one of Netflix\'s most-watched series; fans campaigned successfully to save it from cancellation twice — a rare achievement in television history'] },
    { secret: 'Neo', hint: 'The chosen hacker who discovers the world is a computer simulation in The Matrix', facts: ['The protagonist of The Matrix franchise, created by the Wachowskis; first appeared in The Matrix (1999), played by Keanu Reeves', 'Real name Thomas A. Anderson — a mild-mannered software programmer and hacker who discovers that the world is a simulated reality called the Matrix, built by sentient machines to enslave humanity', 'Takes the red pill offered by Morpheus, unplugging from the Matrix and beginning his journey to become "The One" — a prophesied figure able to bend the Matrix\'s rules at will', 'His name is an anagram of "One"; the film is layered with philosophical, religious and literary symbolism from Christianity, Buddhism, Plato\'s Cave and Lewis Carroll', 'The Matrix (1999) revolutionised action filmmaking with "bullet time" photography and CGI-augmented fight choreography; it won four Academy Awards and is studied in philosophy courses worldwide'] },
    { secret: 'Pink Panther', hint: 'The bumbling French inspector who always accidentally solves the case', facts: ['Inspector Jacques Clouseau is the protagonist of The Pink Panther film series; created by writer Maurice Richlin and director Blake Edwards; first appeared in The Pink Panther (1963)', 'A hilariously incompetent French police inspector — the Chief Inspector\'s bane — who solves cases entirely by accident while remaining obliviously certain of his own genius', 'Played memorably by Peter Sellers in six films (1963–1978); his physical comedy, mangled English accent and complete absence of self-awareness made him one of cinema\'s great comic characters', 'The "Pink Panther" is originally the name of a famous diamond, not the inspector; the animated pink panther cat from the title sequence became so popular it got its own long-running cartoon series', 'The Henry Mancini theme — a cool, slinky jazz melody — is one of the most recognisable pieces of film music ever composed and won the Grammy for Record of the Year in 1965'] },
    { secret: 'The Man with No Name', hint: 'The mysterious cigar-chewing gunfighter of Sergio Leone\'s Spaghetti Western trilogy', facts: ['A nameless drifting gunfighter who appears in Sergio Leone\'s Dollars Trilogy: A Fistful of Dollars (1964), For a Few Dollars More (1965) and The Good, the Bad and the Ugly (1966)', 'Played by Clint Eastwood — then a relatively unknown TV actor; the role launched him into global stardom and defined the antihero archetype', 'Characterised by a battered poncho, a cheroot cigar, stubble and an economy of words — he lets his gun do the talking', 'The films were shot in Spain but set during the American Civil War era; they inspired a revolution in the Western genre and influenced filmmakers from Sam Peckinpah to George Lucas', 'Ennio Morricone\'s iconic whistling score for the trilogy is among the most recognisable music in cinema history — frequently cited as one of the greatest film scores ever composed'] },
    { secret: 'Godzilla', hint: 'The giant radioactive monster that rises from the sea to destroy cities', facts: ['Created by Tomoyuki Tanaka, Ishirō Honda and Eiji Tsuburaya; first appeared in the Toho film Gojira (1954) — conceived as a metaphor for nuclear destruction in post-Hiroshima Japan', 'A prehistoric sea creature mutated and awakened by nuclear testing; initially a symbol of nuclear terror, later reimagined as a protector of Earth against other monsters', 'The American version (1956) inserted Raymond Burr as a reporter to contextualise the story for US audiences; the 1998 US remake was widely derided by fans', 'Has appeared in 38 Japanese Toho films and multiple Hollywood productions — among the longest-running film franchises in history by number of films', 'The term "kaiju" (Japanese for "strange beast") describes Godzilla\'s genre; his roar — created by rubbing a resin-coated leather glove along a double bass string — is one of cinema\'s most iconic sounds'] },
    { secret: 'The Grinch', hint: 'The cave-dwelling green grouch who tries to steal Christmas from the Whos of Whoville', facts: ['Created by Theodor Seuss Geisel (Dr. Seuss); first appeared in the 1957 children\'s book How the Grinch Stole Christmas!', 'A misanthropic, cave-dwelling green creature who despises Christmas and hatches a plan to steal every decoration, gift and feast from the town of Whoville below', 'His heart is described as "two sizes too small"; his change of heart when the Whos sing despite losing everything is one of children\'s literature\'s most beloved redemption arcs', 'The 1966 animated TV special narrated by Boris Karloff is a perennial Christmas classic; Jim Carrey played the character in the 2000 live-action film', 'The phrase "you\'re a mean one, Mr. Grinch" and the character have become cultural shorthand for anyone who is cynically anti-festive'] },
    { secret: 'Pocahontas', hint: 'The Native American woman who brokered peace between her people and English settlers', facts: ['A real historical figure born around 1596 — daughter of Powhatan, chief of a powerful confederacy of tribes in present-day Virginia', 'Born Amonute, also known as Matoaka; the nickname "Pocahontas" meant "playful one" in her language', 'The legendary story of her saving John Smith from execution by her father is disputed by historians; Smith only recounted it years after the event', 'Converted to Christianity, took the name Rebecca, married English tobacco farmer John Rolfe in 1614, and travelled to England in 1616 — where she died aged around 21', 'Disney\'s animated Pocahontas (1995) reimagined her as a romantic heroine; historians have criticised the film\'s inaccuracies, particularly the romantic relationship with Smith'] },
    { secret: 'King Arthur', hint: 'The legendary British king who pulled the sword from the stone and led the Knights of the Round Table', facts: ['A legendary figure of post-Roman Britain; whether a real historical person or a mythological creation remains debated by scholars', 'According to legend, he pulled the sword Excalibur from a stone proving his right to the throne; in some versions Excalibur is given by the Lady of the Lake', 'Founded the Knights of the Round Table at Camelot — the circular table symbolising equality among knights; members included Sir Lancelot, Sir Galahad and Sir Gawain', 'The legend features Merlin as Arthur\'s wizard adviser, Queen Guinevere as his wife, and the treacherous Mordred — often his illegitimate son — as his downfall', 'Arthurian legend has inspired countless works: Malory\'s Le Morte d\'Arthur (1485), Tennyson\'s Idylls of the King, T.H. White\'s The Once and Future King, and Monty Python and the Holy Grail (1975)'] },
    { secret: 'Elsa', hint: 'The ice-powered queen of Arendelle who learns to let go in Disney\'s Frozen', facts: ['A fictional character in Disney\'s animated film Frozen (2013) and Frozen II (2019); inspired by the Snow Queen in Hans Christian Andersen\'s 1844 fairy tale', 'Queen of the kingdom of Arendelle who was born with the power to create ice and snow; her inability to control her powers leads her to isolate herself from the world', 'Her showstopping song "Let It Go" — performed by Idina Menzel — won the Academy Award for Best Original Song and became one of the best-selling singles in history', 'Unlike most Disney princess stories, the act of true love that saves her sister Anna is a sisterly sacrifice — a deliberate subversion of the romantic genre', 'Frozen (2013) became the highest-grossing animated film in history at the time; Elsa became one of the most popular Disney characters of the modern era'] },
    { secret: 'Buzz Lightyear', hint: 'The delusional space ranger toy who is Woody\'s rival and best friend in Toy Story', facts: ['A fictional toy character in Pixar\'s Toy Story franchise; first appeared in Toy Story (1995) voiced by Tim Allen', 'A Space Ranger action figure who initially believes he is a real space ranger — not a toy — on a mission to defeat the evil Emperor Zurg', 'His catchphrase "To infinity and beyond!" became one of the most famous lines in animated film history; his wings and Space Ranger suit are iconic', 'His arc across the Toy Story films — from deluded rival to Woody\'s loyal best friend — is one of the great character journeys in Pixar history', 'Toy Story (1995) was the world\'s first feature-length computer-animated film, revolutionising animation; Buzz is central to its legacy as one of cinema\'s most beloved characters'] },
    { secret: 'Lex Luthor', hint: 'Superman\'s brilliant obsessive nemesis — the billionaire who sees the Man of Steel as humanity\'s oppressor', facts: ['Created by Jerry Siegel and Joe Shuster; first appeared in Action Comics #23 (1940) — Superman\'s most enduring antagonist', 'A brilliant scientist and billionaire businessman who sees Superman not as a hero but as a threat to human self-determination and his own ambitions for power', 'Over the decades his portrayal shifted between cackling supervillain and cold, calculating corporate mogul; the latter (from the 1980s) is considered the definitive version', 'His obsession with Superman is driven by envy, resentment and a genuine philosophical belief that humanity should rely on human genius, not alien gifts', 'Played by Gene Hackman (1978–87), Kevin Spacey (2006) and Jesse Eisenberg (2016) in films; Michael Rosenbaum\'s TV portrayal in Smallville (2001–2011) is widely regarded as one of the best'] },
    { secret: 'Road Runner', hint: 'The lightning-fast bird that endlessly outruns Wile E. Coyote in Looney Tunes', facts: ['Created by Chuck Jones and Michael Maltese; first appeared in Fast and Furry-ous (1949) for Warner Bros.', 'An impossibly fast ground bird whose only spoken word is "Beep Beep" — his speed and cheerful obliviousness are his defining characteristics', 'Every cartoon follows the same formula: Wile E. Coyote purchases elaborate ACME products to catch the Road Runner; all inevitably fail catastrophically — usually harming only the coyote', 'The cartoons are a masterclass in comic timing and escalating absurdity; Chuck Jones kept them funny by following strict rules (the coyote must never harm the Road Runner by his own action)', 'The Road Runner and Wile E. Coyote are among the most analysed cartoon characters in animation history — studied for their perfect comic structure and Sisyphean themes'] },
    { secret: 'Fred Flintstone', hint: 'The loveable hot-headed caveman dad of Bedrock in the world\'s first prime-time animated sitcom', facts: ['Created by William Hanna and Joseph Barbera; first appeared in The Flintstones on ABC on 30 September 1960 — the first prime-time animated TV series in history', 'A loud, impulsive but good-hearted quarry worker living in the Stone Age town of Bedrock with his wife Wilma, daughter Pebbles and pet dinosaur Dino', 'His best friend and neighbour is Barney Rubble; their relationship — the pompous schemer and the sweet sidekick — is a template repeated across sitcoms ever since', 'The show was directly inspired by The Honeymooners (1955) and transposed the domestic comedy of postwar American suburbia into a prehistoric setting', 'Ran for six seasons (1960–1966); his catchphrase "Yabba-dabba-doo!" is one of the most recognisable exclamations in animation history'] },
    { secret: 'Huckleberry Finn', hint: 'The barefoot outcast boy who rafts down the Mississippi with a runaway slave in Mark Twain\'s masterpiece', facts: ['Created by Mark Twain; first appeared in The Adventures of Tom Sawyer (1876) and is the protagonist of Adventures of Huckleberry Finn (1884)', 'The son of the town drunk — an outcast who sleeps in barrels and lives by his wits outside respectable society; his freedom from convention makes him the perfect narrator', 'Fakes his own death to escape his abusive father and rafts down the Mississippi River with Jim — a runaway enslaved man — forming a profound friendship', 'Ernest Hemingway wrote "all modern American literature comes from one book by Mark Twain called Huckleberry Finn" — considered the first great American novel', 'Banned in 1885 for being "trash suitable only for the slums" and later for racial language; it remains one of the most taught and challenged books in American schools'] },
    { secret: 'Tom Sawyer', hint: 'The mischievous Missouri boy who tricks friends into whitewashing his fence in Mark Twain\'s classic', facts: ['Created by Mark Twain; the protagonist of The Adventures of Tom Sawyer (1876), set in the fictional town of St. Petersburg, Missouri, based on Twain\'s own childhood in Hannibal', 'A clever, imaginative boy who lives with his Aunt Polly and constantly schemes his way out of trouble and chores — most famously tricking friends into whitewashing his fence', 'His love interest is Becky Thatcher; his best friend is the outcast Huckleberry Finn; his nemesis is the murderous villain Injun Joe', 'The novel\'s most dramatic plot involves Tom and Huck witnessing a murder in a graveyard and being too frightened to tell the truth until Tom finally testifies to save an innocent man', 'Mark Twain based Tom on himself and childhood friends; he is the archetypal mischievous American boy and influenced countless fictional children from Bart Simpson to Harry Potter'] },
    { secret: 'Oliver Twist', hint: 'The orphan boy who asks for more gruel in Dickens\' tale of London\'s criminal underworld', facts: ['The protagonist of Charles Dickens\' Oliver Twist (1837–39) — Dickens\' second novel and one of the first to have a child as the central character', 'Born in a workhouse to a mother who dies immediately after his birth; he famously asks the workhouse master "Please, sir, I want some more"', 'After escaping the workhouse he is drawn into the London criminal underworld led by Fagin — who trains child pickpockets — and falls in with the brutal Bill Sikes', 'His character is pure innocence set against the corruption of Victorian society; Dickens wrote the novel as an attack on the 1834 Poor Law that criminalised poverty', 'The 1968 musical film Oliver! won the Academy Award for Best Picture; the story has been adapted for stage and screen over 40 times'] },
    { secret: 'Quasimodo', hint: 'The deformed bell-ringer of Notre-Dame Cathedral who falls in love with the gypsy Esmeralda', facts: ['The protagonist of Victor Hugo\'s Notre-Dame de Paris (1831) — known in English as The Hunchback of Notre-Dame — one of the most celebrated French novels', 'A deaf, deformed bell-ringer who was abandoned as a baby on the steps of Notre-Dame and raised by the archdeacon Frollo; he becomes devoted to the cathedral and its bells', 'Falls in love with the beautiful gypsy dancer Esmeralda — a love that is pure but doomed, as she loves the dashing Captain Phoebus instead', 'Hugo wrote the novel partly to raise awareness of Gothic architecture being destroyed; the book was so successful it helped save Notre-Dame and sparked a Gothic revival movement across Europe', 'Disney\'s animated The Hunchback of Notre-Dame (1996) softened the dark original; in Hugo\'s novel, nearly every character including Esmeralda and Quasimodo dies tragically'] },
    { secret: 'Romeo', hint: 'The young Montague who falls fatally in love with a Capulet girl in Shakespeare\'s greatest tragedy', facts: ['The protagonist of William Shakespeare\'s Romeo and Juliet (c.1594–96) — arguably the world\'s most famous love story', 'A young man of the Montague family in Verona who falls instantly and completely in love with Juliet Capulet at a party — the daughter of his family\'s sworn enemies', 'Secretly marries Juliet, kills her cousin Tybalt in a duel, is banished from Verona, and — believing Juliet dead — kills himself with poison beside her tomb', 'His name has become a synonym for a passionate male lover: to call someone a "Romeo" means they are charming, devoted and romantically reckless', 'The play has inspired countless adaptations — most notably West Side Story (1957/1961/2021), which transplants the story to 1950s New York gang warfare'] },
    { secret: 'Juliet', hint: 'The Capulet girl who secretly marries her family\'s enemy and chooses death over life without him', facts: ['The heroine of William Shakespeare\'s Romeo and Juliet (c.1594–96); she is just thirteen years old at the start of the play', 'Meets Romeo at a Capulet party and falls in love; their famous balcony exchange of vows is among the most quoted passages in all of literature', 'Defies her father\'s plan to marry Count Paris by secretly marrying Romeo, then takes a sleeping potion to fake her death and avoid the wedding', 'Wakes to find Romeo dead beside her and immediately kills herself with his dagger — refusing to live in a world without him', 'Juliet is one of Shakespeare\'s most fully realised female characters: brave, witty, clear-eyed and decisive; the play\'s tragedy is that society leaves her with no good options'] },
    { secret: 'Ali Baba', hint: 'The poor woodcutter who discovers a thieves\' treasure cave by overhearing a magic phrase', facts: ['The hero of Ali Baba and the Forty Thieves — a story from the One Thousand and One Nights, introduced to the West in Antoine Galland\'s French translation (1704–1717)', 'A poor woodcutter who accidentally discovers a cave filled with treasure belonging to forty thieves by overhearing the magic password "Open Sesame"', 'His greedy brother Cassim also learns the password but is caught inside the cave and killed by the thieves when he forgets the words to open the door', 'Is saved by his clever slave girl Morgiana, who foils repeated assassination attempts by the thief captain — including the famous oil-jar trap — and ultimately kills the captain herself', '"Open Sesame" has entered multiple languages as an idiom for a magic password or instant solution; it is one of the most famous phrases in world folklore'] },
    { secret: 'Puss in Boots', hint: 'The swashbuckling fairy-tale cat with enormous eyes and a cunning sword arm', facts: ['A fairy-tale character originating in Giovanni Straparola\'s Facetious Nights (1550s) and made famous by Charles Perrault\'s version in 1697', 'In Perrault\'s tale, a cat inherited by the youngest son uses cunning and deception to win his master wealth, a castle and a princess — demonstrating that wit beats fortune', 'The DreamWorks animated character — voiced by Antonio Banderas — first appeared in Shrek 2 (2004) before getting his own beloved franchise', 'His theatrical flair, Spanish accent, hat, boots and enormous disarming eyes have made him one of animation\'s most beloved characters', 'Puss in Boots: The Last Wish (2022) was acclaimed for its revolutionary animation style and themes about mortality — widely considered one of the greatest animated films of recent years'] },
    { secret: 'Rambo', hint: 'The traumatised Vietnam veteran who becomes a one-man army against those who cross him', facts: ['Created by novelist David Morrell; first appeared in the novel First Blood (1972) — defined by Sylvester Stallone\'s film portrayal from 1982', 'John James Rambo — a highly decorated former Green Beret and Vietnam veteran suffering from PTSD who simply wants to be left alone but is pushed into violence by authority', 'In First Blood (1982), he is a sympathetic victim of an unjust system; later films transformed him into a nearly superhuman action hero dispatching hundreds single-handedly', 'The red headband, shirtless physique and machine gun became iconic 1980s action imagery; "Rambo" entered the language as a term for reckless solo aggression', 'Stallone wrote or co-wrote all the Rambo scripts; the franchise has grossed over $900 million worldwide across five films'] },
    { secret: 'Percy Jackson', hint: 'The teenage son of Poseidon who discovers he is a Greek demigod in the modern world', facts: ['Created by Rick Riordan; first appeared in The Lightning Thief (2005) — inspired by stories Riordan told his dyslexic, ADHD son at bedtime', 'Perseus "Percy" Jackson — a 12-year-old who discovers he is the half-blood son of Poseidon, Greek god of the sea, and is drawn into Olympian conflicts', 'Attends Camp Half-Blood, a training ground for demigods hidden in Long Island; his quests involve recovering stolen divine artefacts to prevent war among the gods', 'His dyslexia is explained as his brain being hard-wired for Ancient Greek; his ADHD as battlefield reflexes — Riordan\'s deliberate framing of learning differences as strengths', 'The series has sold over 180 million copies worldwide and spawned multiple sequel series; a Disney+ TV adaptation launched in 2023'] },
    { secret: 'Inspector Clouseau', hint: 'The magnificently incompetent French detective who solves every case entirely by accident', facts: ['Created by writer Maurice Richlin and director Blake Edwards; first played by Peter Sellers in The Pink Panther (1963) — a role that defined both men\'s careers', 'Chief Inspector Jacques Clouseau of the French Sûreté — a man of towering self-confidence and catastrophic incompetence who solves every case through sheer accidental chaos', 'His mangled French accent, elaborate disguises and nightly battles with his own manservant Cato (who attacks him without warning to keep him sharp) are the comedy\'s lifeblood', 'Peter Sellers\' performance was so beloved that after his death in 1980, the sequel Trail of the Pink Panther (1982) had to be assembled entirely from his unused footage', 'Steve Martin played Clouseau in two remake films (2006, 2009); neither matched the magic of Sellers, whose performance remains one of cinema\'s greatest comic creations'] },
    { secret: 'Laurel and Hardy', hint: 'The thin-and-fat comedy duo whose misadventures made them the most beloved double act in film history', facts: ['Stan Laurel (British, 1890–1965) and Oliver Hardy (American, 1892–1957); first appeared together in The Lucky Dog (1921) but became a formal team from 1927 at Hal Roach Studios', 'Their dynamic: Stan — the childlike, tearful, confused innocent; Ollie — the pompous self-important "leader" who blames Stan for every disaster he is equally responsible for', 'Made over 100 short films and feature films together; The Music Box (1932) won the first-ever Academy Award for Live Action Short Film', 'Their physical comedy was meticulously crafted; Hardy\'s "camera look" of exasperated resignation directly at the audience remains one of comedy\'s great devices', 'Stan Laurel received an honorary Academy Award in 1961; their legacy endures in the work of virtually every double-act comedian who followed them'] },
    { secret: 'Austin Powers', hint: 'The groovy 1960s British super-spy cryogenically thawed in the 1990s to battle his nemesis Dr. Evil', facts: ['Created and played by Mike Myers; first appeared in Austin Powers: International Man of Mystery (1997) — a loving parody of James Bond films, particularly the 1960s Sean Connery era', 'A swinging London spy — complete with velvet suits, rotten teeth and catchphrases like "Yeah, baby!" — frozen in 1967 and thawed in 1997 to battle the villainous Dr. Evil', 'Dr. Evil (also played by Myers) is a direct parody of Bond villain Blofeld, complete with white cat, volcano lair and elaborate world-domination plots', 'The first film was a modest theatrical hit but became a massive home video phenomenon; the sequel The Spy Who Shagged Me (1999) opened to one of the decade\'s biggest weekends', 'Catchphrases including "Oh behave!", "Groovy, baby!" and "Yeah, baby!" became a late-1990s cultural phenomenon — arguably the most quotable comedy franchise of the era'] },
    { secret: 'Ace Ventura', hint: 'The eccentric pet detective who solves animal crimes with manic physical comedy', facts: ['Created by Jack Bernstein and Tom Shadyac; played by Jim Carrey in Ace Ventura: Pet Detective (1994) — the film that launched Carrey into superstardom', 'A wildly eccentric private detective who specialises in finding missing animals; his methods are unorthodox, his personality all-consuming and his hair is styled in a distinctive pompadour', 'His physical comedy — rubbery facial expressions, talking through his backside, impressions and complete social unawareness — showcased Jim Carrey\'s elastic gifts at their most anarchic', 'Made on a $15 million budget, Pet Detective grossed $107 million worldwide; it was followed by Ace Ventura: When Nature Calls (1995), also a major box office success', 'Inseparable from Jim Carrey\'s comedy persona; his catchphrase "Alrighty then!" remains instantly recognisable 30 years later'] },
    { secret: 'The Mask', hint: 'The meek bank clerk who transforms into a green-faced reality-bending trickster wearing an ancient mask', facts: ['Created by Mike Richardson and Mark Badger for Dark Horse Comics (1987); the 1994 film starred Jim Carrey and launched Cameron Diaz\'s film career', 'Stanley Ipkiss — a timid, put-upon bank clerk who finds an ancient wooden mask that transforms him into a green-faced cartoon-like trickster with limitless reality-bending powers', 'The Mask gives its wearer whatever they most deeply desire while removing all inhibition; in the comics this makes the character murderous, but the film softened it into zany comedy', 'Jim Carrey\'s performance blended his physical comedy gifts with groundbreaking CGI that made his elastic cartoon expressions literally possible on screen for the first time', 'The film grossed $351 million on a $23 million budget — one of 1994\'s biggest hits; a 2005 sequel without Carrey was poorly received'] },
    { secret: 'Garfield', hint: 'The lasagna-obsessed Monday-hating tabby cat who treats his owner Jon with magnificent contempt', facts: ['Created by Jim Davis; first appeared in comic strip form on 19 June 1978 — now one of the most widely syndicated comic strips in history, appearing in over 2,500 newspapers', 'An enormously fat orange tabby cat owned by Jon Arbuckle; his defining traits are love of lasagna, contempt for Mondays, disdain for exercise and relentless abuse of the dog Odie', 'His lazy, sardonic worldview — conveyed through thought bubbles, never spoken aloud — made him one of the most relatable characters in popular culture', 'Guinness World Records lists Garfield as the world\'s most widely syndicated comic strip; the franchise generates over $1 billion in annual merchandise revenue', 'Bill Murray voiced Garfield in two feature films (2004, 2006); a new animated film starring Chris Pratt was released in 2024'] },
    { secret: 'Snoopy', hint: 'Charlie Brown\'s imaginative beagle who fantasises about being a WWI flying ace from atop his doghouse', facts: ['Created by Charles M. Schulz; first appeared in the Peanuts comic strip on 4 October 1950 — the same day as the strip\'s debut', 'A white beagle with a rich fantasy life who often imagines himself as a World War I Flying Ace battling the Red Baron from the roof of his doghouse, which he treats as a Sopwith Camel', 'Communicates without words but expresses a wide range of emotions; his best friend is the tiny yellow bird Woodstock, who appears as random scratchy lines', 'Performs the famous "Snoopy dance" — a joyful, wiggling solo — which has become one of the most recognisable animations in popular culture', 'Adopted as the NASA mascot for safety; the NASA Snoopy Award is given to employees who contribute to flight safety and crew safety awareness'] },
    { secret: 'Charlie Brown', hint: 'The loveable round-headed boy who never manages to kick the football or win a baseball game', facts: ['Created by Charles M. Schulz; the protagonist of the Peanuts comic strip, which ran from 2 October 1950 until Schulz\'s death on 12 February 2000 — the day his final strip was published', 'A good-natured, perpetually anxious boy who is unlucky in love (the Little Red-Haired Girl), sport (his baseball team always loses) and seasonal rituals (Lucy always pulls away the football)', 'A Charlie Brown Christmas (1965) — a TV special about the commercialisation of Christmas — became one of the most watched holiday programmes in US television history', 'Schulz described Charlie Brown as "Everyman" — the universal experience of self-doubt, failure and quiet dignity in the face of repeated disappointment', 'Peanuts is the best-selling comic strip of all time; Charlie Brown\'s round head and zigzag shirt are among the most recognised images in 20th-century popular culture'] },
    { secret: 'Woodstock', hint: 'Snoopy\'s tiny yellow bird companion who communicates only in vertical scratchy lines', facts: ['Created by Charles M. Schulz; appeared as a nameless bird around 1966; officially named Woodstock in 1970 — after the famous 1969 music festival', 'A tiny yellow bird who is Snoopy\'s best friend; he cannot fly properly — often spiralling upside down — and communicates in vertical lines that only Snoopy can understand', 'Despite his tiny size and apparent fragility, Woodstock is plucky and brave, often accompanying Snoopy on his WWI Flying Ace fantasies as his loyal mechanic', 'Schulz originally was uncertain whether to make Woodstock male or female; the character is drawn with such minimal detail that gender remains largely ambiguous despite the masculine name', 'Became so popular he appeared on his own merchandise line; the Metlife blimp — shaped like Snoopy — historically carries an image of Woodstock on its tail'] },
    { secret: 'Dennis the Menace', hint: 'The blond mischievous five-year-old in a red-striped shirt who is the permanent bane of Mr. Wilson\'s existence', facts: ['Created by Hank Ketcham; first appeared in US newspapers on 12 March 1951 — coincidentally the same day a completely separate British character of the same name appeared in The Beano', 'A blond, energetic five-year-old whose well-meaning antics constantly torment his neighbour Mr. George Wilson — a retired man who craves peace and quiet', 'Despite being called "the menace," Dennis is genuinely kind-hearted; his mischief is accidental or born of excessive enthusiasm rather than malice', 'His props — a slingshot, his dog Ruff, his friends Joey and Margaret and his long-suffering nemesis Mr. Wilson — have remained constants across 70+ years of strips', 'A live-action film starring Walter Matthau as Mr. Wilson and Mason Gamble as Dennis was released in 1993; a long-running animated series aired 1986–1988'] },
    { secret: 'Bambi', hint: 'The young deer prince of the forest who loses his mother to hunters in Disney\'s most tearjerking film', facts: ['Based on the 1923 Austrian novel Bambi, a Life in the Woods by Felix Salten; Disney\'s animated film (1942) is one of the studio\'s most enduring works', 'A young deer who grows from fawn to proud stag in the forest, guided by his father the Great Prince of the Forest', 'His mother\'s death — shot by an unseen hunter, conveyed only by a gunshot and Bambi\'s frantic cries — is one of the most emotionally devastating moments in cinema history', 'The film was a commercial disappointment on original release (wartime America) but has since been recognised as a masterpiece of naturalistic animation', 'Research showed a measurable "Bambi effect" — American hunting licence applications declined after the film\'s release, an extraordinary real-world impact for an animated film'] },
    { secret: 'Dumbo', hint: 'The baby elephant with enormous ears who discovers he can fly and becomes the star of the circus', facts: ['Based on the 1939 story Dumbo, the Flying Elephant by Helen Aberson; Disney\'s animated film was released in 1941, saving the studio financially after Fantasia and Pinocchio underperformed', 'A baby elephant born with enormous ears — mocked by other elephants and nicknamed "Dumbo" — who discovers his ears allow him to fly', 'His mother Mrs. Jumbo is imprisoned after defending him from circus-goers; the scene of her cradling Dumbo with her trunk through the bars to the lullaby "Baby Mine" is one of cinema\'s most tearful moments', 'His only friend is Timothy Mouse — a small but fiercely loyal mouse who believes in Dumbo when no one else does and orchestrates his transformation into a star', 'Tim Burton\'s live-action remake (2019) expanded the story; the original remains on the American Film Institute\'s list of the greatest American films'] },
    { secret: 'Hello Kitty', hint: 'The white cat without a mouth who became Japan\'s most globally recognised cultural export', facts: ['Created by designer Yuko Shimizu and produced by Sanrio; first appeared on a vinyl coin purse in Japan in 1974; her full name is Kitty White', 'A white anthropomorphic cat with no mouth — Sanrio explains she speaks from her heart and can reflect whatever emotion the owner is feeling', 'She has a blue bow on her left ear, a pet cat named Charmmy Kitty, and lives with her parents George and Mary and twin sister Mimmy — in London, according to official lore', 'One of the most valuable character franchises in the world — generating roughly $8 billion in annual revenue from over 50,000 licensed products in 130 countries', 'Her global appeal transcends age and gender; adopted as an icon by fashion designers, pop stars and street artists; appointed UNICEF Special Friend of Children in 1983'] },
    { secret: 'Pikachu', hint: 'The yellow electric mouse who is the face of the Pokémon franchise and Ash\'s lifelong companion', facts: ['Created by Ken Sugimori; first appeared in Pokémon Red and Green (Japan, 1996); became the franchise mascot from the anime series (1997)', 'An electric-type Pokémon — a small, yellow, mouse-like creature with red cheeks that store electrical charges; its name combines "pika" (electric spark sound) and "chu" (mouse squeak)', 'Ash Ketchum\'s partner in the Pokémon anime (1997–2023) — their 25-year journey together was one of the longest continuous character arcs in animated television history', 'Pokémon is the most commercially valuable media franchise in history: over $150 billion in total revenue — surpassing Star Wars, Hello Kitty and Marvel', 'Appears on tail fins of All Nippon Airways planes, has been a Macy\'s Thanksgiving Day Parade float since 2001, and is globally recognised as the face of Japanese pop culture'] },
    { secret: 'E.T.', hint: 'The gentle alien stranded on Earth who befriends a lonely boy in Spielberg\'s 1982 masterpiece', facts: ['The central character of Steven Spielberg\'s E.T. the Extra-Terrestrial (1982) — written by Melissa Mathison; E.T. stands for Extra-Terrestrial', 'A small, brown alien botanist accidentally left behind on Earth when his spaceship departs; found by 10-year-old Elliott, who hides him and forms a psychic bond with him', 'Famous for the bicycle-against-the-moon silhouette (the logo of Amblin Entertainment), the glowing healing fingertip, and the phrase "E.T. phone home"', 'E.T. (1982) became the highest-grossing film of all time upon release, holding the record for 11 years until Jurassic Park (also Spielberg) surpassed it in 1993', 'John Williams\' score — particularly the flying bicycle sequence — is considered one of his greatest works; the film made Spielberg the most commercially successful director in history at the time'] },
    { secret: 'WALL-E', hint: 'The lonely waste-collecting robot left alone on Earth for 700 years who falls in love with another robot', facts: ['The protagonist of Pixar\'s WALL-E (2008) — directed by Andrew Stanton; the name stands for Waste Allocation Load Lifter Earth-class', 'A small, cube-shaped robot left on an abandoned, rubbish-covered Earth for 700 years, faithfully compressing garbage while developing a personality and a love of musicals', 'Falls in love with EVE — a sleek, advanced probe robot sent to scan Earth for plant life — and follows her into space on an adventure that leads humanity back to Earth', 'The film\'s first 40 minutes have almost no dialogue; WALL-E and EVE\'s romance is conveyed entirely through gesture, movement and expression — a masterclass in silent visual storytelling', 'Won the Academy Award for Best Animated Feature (2009); widely considered one of Pixar\'s greatest films and one of the finest science fiction films of the 21st century'] },
  ],
};

// ─── Junior content ───────────────────────────────────────────────────────────
const JUNIOR_THEMES = [
  { id: 'famous_people',      label: 'Famous People',        icon: '🌟', desc: 'Heroes, leaders and legends',           color: '#ff6b35' },
  { id: 'famous_places',      label: 'Famous Places',        icon: '🗺️',  desc: 'Wonders and iconic landmarks',          color: '#00c9a7' },
  { id: 'movies_cartoons',    label: 'Movies & Cartoons',    icon: '🎬', desc: 'Beloved characters and stories',         color: '#ff6b9d' },
  { id: 'animals_nature',     label: 'Animals & Nature',     icon: '🦁', desc: 'Amazing creatures and habitats',         color: '#a8e063' },
  { id: 'sports_games',       label: 'Sports & Games',       icon: '⚽', desc: 'Sports stars and great competitions',    color: '#4fc3f7' },
  { id: 'science_inventions', label: 'Science & Inventions', icon: '🔬', desc: 'Discoveries that changed the world',     color: '#c77dff' },
];

const JUNIOR_LIBRARY = {
  famous_people: [
    {
      secret: 'Albert Einstein',
      hint: 'A wild-haired scientist who came up with the most famous equation in physics',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '14 March 1879' },
        { icon: '✝️', label: 'Died', value: '18 April 1955' },
        { icon: '🏆', label: 'Field', value: 'Physics' },
        { icon: '🌍', label: 'Nationality', value: 'German-American' },
      ],
      facts: [
        'Albert Einstein was born in Germany in 1879 and won the Nobel Prize in Physics in 1921 for explaining how light works.',
        'He developed the theory of relativity, which changed how scientists understand time, space, and gravity.',
        'His famous equation E=mc² shows that energy and mass are two forms of the same thing — a huge discovery.',
        'Einstein did not speak fluently until he was about four years old, but he grew up to become one of the greatest thinkers ever.',
        'He loved playing the violin and once said that if he had not been a scientist, he would have been a musician.',
      ],
    },
    {
      secret: 'Usain Bolt',
      hint: 'The Jamaican sprinter who became the fastest human ever recorded',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '21 August 1986' },
        { icon: '🏆', label: 'Field', value: 'Athletics (Sprinting)' },
        { icon: '🌍', label: 'Nationality', value: 'Jamaican' },
      ],
      facts: [
        'Usain Bolt was born in Jamaica in 1986 and set the world record for the 100 metres at 9.58 seconds in 2009.',
        'He won eight Olympic gold medals across three different Games — 2008, 2012 and 2016 — making him one of the greatest Olympic athletes ever.',
        'Bolt\'s top speed during a race was measured at about 44.7 km/h, faster than any human in recorded history.',
        'He is so tall for a sprinter — 1.95 m — that coaches once worried his height would slow him down. It did not.',
        'His trademark lightning-bolt celebration after races became one of the most recognised poses in sports history.',
      ],
    },
    {
      secret: 'Malala Yousafzai',
      hint: 'The Pakistani girl who was shot for going to school and became the youngest Nobel Peace Prize winner',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '12 July 1997' },
        { icon: '🏆', label: 'Field', value: 'Education & Activism' },
        { icon: '🌍', label: 'Nationality', value: 'Pakistani' },
      ],
      facts: [
        'Malala Yousafzai was born in Pakistan in 1997 and stood up for girls\' right to go to school even when it was dangerous to do so.',
        'At age 15 she was shot by the Taliban while on her school bus, but she survived and continued fighting for education.',
        'In 2014, at just 17 years old, she became the youngest person ever to win the Nobel Peace Prize.',
        'She started speaking out publicly when she was only 11, writing a blog about life under the Taliban using a fake name.',
        'She founded the Malala Fund, a charity that helps millions of girls around the world go to school.',
      ],
    },
    {
      secret: 'Neil Armstrong',
      hint: 'The American astronaut who was the first human to walk on the Moon',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '5 August 1930' },
        { icon: '✝️', label: 'Died', value: '25 August 2012' },
        { icon: '🏆', label: 'Field', value: 'Space Exploration' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Neil Armstrong was born in Ohio in 1930 and trained as a pilot and engineer before becoming an astronaut.',
        'On 20 July 1969, as commander of Apollo 11, he became the first human being to set foot on the Moon.',
        'His famous words as he stepped onto the lunar surface were: "That\'s one small step for man, one giant leap for mankind."',
        'Armstrong and fellow astronaut Buzz Aldrin spent about two and a half hours walking on the Moon and collected rock samples to bring back to Earth.',
        'After leaving NASA, Armstrong went on to teach engineering at a university and rarely gave interviews, preferring a quiet life.',
      ],
    },
    {
      secret: 'Nelson Mandela',
      hint: 'The South African leader who spent 27 years in prison before becoming his country\'s first democratically elected president',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '18 July 1918' },
        { icon: '✝️', label: 'Died', value: '5 December 2013' },
        { icon: '🏆', label: 'Field', value: 'Politics & Civil Rights' },
        { icon: '🌍', label: 'Nationality', value: 'South African' },
      ],
      facts: [
        'Nelson Mandela was born in South Africa in 1918 and spent his life fighting against a system called apartheid, which treated Black people unfairly.',
        'He was sentenced to life in prison in 1964 and spent 27 years locked up, yet he never gave up his beliefs.',
        'After his release in 1990, he helped lead South Africa to its first free elections in 1994 and was elected president.',
        'He won the Nobel Peace Prize in 1993 together with South African president F.W. de Klerk for their peaceful work to end apartheid.',
        'Mandela is celebrated worldwide as a symbol of courage, forgiveness, and the struggle for equal rights for everyone.',
      ],
    },
    {
      secret: 'Amelia Earhart',
      hint: 'The daring American aviator who was the first woman to fly solo across the Atlantic Ocean',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '24 July 1897' },
        { icon: '✝️', label: 'Died', value: 'c. 2 July 1937' },
        { icon: '🏆', label: 'Field', value: 'Aviation' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Amelia Earhart was born in Kansas in 1897 and became fascinated with flying after attending an airshow as a child.',
        'In 1932 she became the first woman — and only the second person — to fly solo non-stop across the Atlantic Ocean.',
        'She set many speed and altitude records and worked hard to encourage other women to pursue careers in aviation.',
        'In 1937 she attempted to fly around the entire world; she disappeared over the Pacific Ocean and was never found.',
        'Her bravery and determination made her a hero and a symbol of what women could achieve at a time when many doors were closed to them.',
      ],
    },
    {
      secret: 'Leonardo da Vinci',
      hint: 'The Italian Renaissance genius who painted the Mona Lisa and designed flying machines 500 years before aeroplanes existed',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '15 April 1452' },
        { icon: '✝️', label: 'Died', value: '2 May 1519' },
        { icon: '🏆', label: 'Field', value: 'Art & Science' },
        { icon: '🌍', label: 'Nationality', value: 'Italian' },
      ],
      facts: [
        'Leonardo da Vinci was born in Italy in 1452 and was curious about almost everything — art, science, engineering, music, and nature.',
        'He painted the Mona Lisa and The Last Supper, two of the most famous paintings in the world.',
        'His notebooks are full of detailed drawings of inventions including a flying machine, a tank, and a solar power device — centuries before they were built.',
        'Leonardo was left-handed and often wrote his notes in mirror writing, from right to left, which you need a mirror to read easily.',
        'He studied human anatomy by examining bodies, making hundreds of incredibly detailed drawings of muscles and bones that are still admired today.',
      ],
    },
    {
      secret: 'Cristiano Ronaldo',
      hint: 'The Portuguese football superstar often called one of the greatest players of all time',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '5 February 1985' },
        { icon: '🏆', label: 'Field', value: 'Football (Soccer)' },
        { icon: '🌍', label: 'Nationality', value: 'Portuguese' },
      ],
      facts: [
        'Cristiano Ronaldo was born in Madeira, Portugal in 1985 and signed his first professional contract with Sporting CP aged 16.',
        'He has won the Ballon d\'Or — the award for the world\'s best footballer — five times and has scored over 900 career goals.',
        'Ronaldo is famous for his powerful free-kicks, his incredible fitness, and his determination to train harder than almost anyone else.',
        'He has played for top clubs including Manchester United, Real Madrid, and Juventus, and is the all-time top scorer for the Portuguese national team.',
        'Off the pitch he is known for his charity work, having donated money for disaster relief and children\'s hospitals many times.',
      ],
    },
    {
      secret: 'Isaac Newton',
      hint: 'The British scientist who discovered gravity and changed how we understand the universe',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '4 January 1643' },
        { icon: '✝️', label: 'Died', value: '31 March 1727' },
        { icon: '🏆', label: 'Field', value: 'Physics & Mathematics' },
        { icon: '🌍', label: 'Nationality', value: 'British' },
      ],
      facts: [
        'Isaac Newton was born in England in 1643 and is famous for developing the laws of gravity and motion that explain how things move.',
        'The story goes that he was sitting under an apple tree when an apple fell and made him wonder why things always fall downwards.',
        'He invented a whole new type of mathematics called calculus to help him solve problems about moving objects — and he did it before he was 27!',
        'Newton also discovered that white light is actually made up of all the colours of the rainbow by shining it through a glass prism.',
        'His book Principia Mathematica (1687) is one of the most important science books ever written and is still studied today.',
      ],
    },
    {
      secret: 'Walt Disney',
      hint: 'The American animator who created Mickey Mouse and built a magical entertainment empire',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '5 December 1901' },
        { icon: '✝️', label: 'Died', value: '15 December 1966' },
        { icon: '🏆', label: 'Field', value: 'Animation & Entertainment' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Walt Disney was born in Illinois, USA in 1901 and fell in love with drawing from a very young age.',
        'He created Mickey Mouse in 1928 — one of the most recognised cartoon characters in the world — and gave Mickey his own voice.',
        'Disney produced the world\'s first full-length animated film, Snow White and the Seven Dwarfs, in 1937, which many people said was impossible to make.',
        'He opened Disneyland in California in 1955 and dreamed up Walt Disney World in Florida, which opened in 1971 after he passed away.',
        'Disney won more Academy Awards (22) than anyone else in history and built a company that today makes some of the world\'s most beloved films.',
      ],
    },
    {
      secret: 'Michael Jackson',
      hint: 'The American pop star known as the "King of Pop" whose moonwalk dance move stunned the world',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '29 August 1958' },
        { icon: '✝️', label: 'Died', value: '25 June 2009' },
        { icon: '🏆', label: 'Field', value: 'Music & Entertainment' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Michael Jackson was born in Indiana, USA in 1958 and started performing with his brothers in a group called The Jackson 5 when he was just five years old.',
        'His album Thriller (1982) is the best-selling album of all time, with over 70 million copies sold worldwide.',
        'He invented the "moonwalk" dance move in 1983 — a slide that makes it look like you are walking forward while actually moving backwards.',
        'Jackson was known for his incredible stage shows, his signature white glove, and his high-pitched singing voice.',
        'He was also a huge charity supporter and donated more than $300 million to charity during his lifetime.',
      ],
    },
    {
      secret: 'Lionel Messi',
      hint: 'The Argentine football wizard widely considered the greatest footballer of all time',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '24 June 1987' },
        { icon: '🏆', label: 'Field', value: 'Football (Soccer)' },
        { icon: '🌍', label: 'Nationality', value: 'Argentine' },
      ],
      facts: [
        'Lionel Messi was born in Rosario, Argentina in 1987 and moved to Spain as a child so he could get treatment for a growth condition and train with FC Barcelona.',
        'He won the FIFA World Cup with Argentina in 2022, completing the one trophy that had been missing from his extraordinary career.',
        'Messi has won the Ballon d\'Or — the award for the world\'s best player — a record eight times.',
        'He is famous for his incredible dribbling skills; he can change direction at full speed while keeping the ball so close it looks glued to his foot.',
        'During his time at FC Barcelona he became the club\'s all-time top scorer with over 672 goals, more than any other player in the club\'s history.',
      ],
    },
    {
      secret: 'Muhammad Ali',
      hint: 'The American boxing champion known as "The Greatest" who was also a fearless civil rights activist',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '17 January 1942' },
        { icon: '✝️', label: 'Died', value: '3 June 2016' },
        { icon: '🏆', label: 'Field', value: 'Boxing & Activism' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Muhammad Ali was born Cassius Clay in Louisville, Kentucky in 1942 and started boxing when he was 12 years old after someone stole his bicycle.',
        'He won the Olympic gold medal in 1960 and became world heavyweight champion three times — more than any boxer before him.',
        'Ali was known for his lightning-fast footwork and his famous battle cry: "Float like a butterfly, sting like a bee!"',
        'He refused to fight in the Vietnam War, saying it went against his beliefs, which cost him three years of his boxing career but earned worldwide respect.',
        'Outside the ring he was a passionate speaker for civil rights, equality, and peace, and is remembered as one of the greatest sportsmen and humanitarians in history.',
      ],
    },
    {
      secret: 'Bill Gates',
      hint: 'The American tech billionaire who co-founded Microsoft and made personal computers available to everyone',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '28 October 1955' },
        { icon: '🏆', label: 'Field', value: 'Technology & Philanthropy' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Bill Gates was born in Seattle, USA in 1955 and wrote his first computer program aged 13, scheduling classes at his school.',
        'He co-founded Microsoft with Paul Allen in 1975, and their software — including Windows — helped put a personal computer in millions of homes and offices.',
        'Gates became the world\'s richest person in the 1990s, a title he held on and off for many years.',
        'He left his day-to-day role at Microsoft to focus on the Bill & Melinda Gates Foundation, which works to fight diseases and improve education in poorer countries.',
        'The foundation has spent over $65 billion on global health and development projects, helping to nearly wipe out diseases like polio.',
      ],
    },
    {
      secret: 'Steve Jobs',
      hint: 'The American visionary who co-founded Apple and gave the world the iPhone, iPad and iPod',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '24 February 1955' },
        { icon: '✝️', label: 'Died', value: '5 October 2011' },
        { icon: '🏆', label: 'Field', value: 'Technology & Entrepreneurship' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Steve Jobs was born in San Francisco in 1955 and co-founded Apple in his parents\' garage at age 21 together with Steve Wozniak.',
        'He was fired from Apple in 1985 but returned in 1997 to rescue the company and turned it into the most valuable business in the world.',
        'Jobs introduced the iPod in 2001, revolutionising music; the iPhone in 2007, which changed how we use phones; and the iPad in 2010.',
        'He was famous for his spectacular product launches where he wore his signature black turtleneck and jeans.',
        'His motto was "Stay hungry, stay foolish" — encouraging people to keep learning and never be afraid to take risks.',
      ],
    },
    {
      secret: 'J.K. Rowling',
      hint: 'The British author who wrote the Harry Potter series and became one of the most successful writers in history',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '31 July 1965' },
        { icon: '🏆', label: 'Field', value: 'Literature' },
        { icon: '🌍', label: 'Nationality', value: 'British' },
      ],
      facts: [
        'J.K. Rowling was born in England in 1965 and had the idea for Harry Potter on a delayed train journey in 1990, scribbling notes on whatever scraps of paper she could find.',
        'She was a single mother living on government benefits when she finished the first Harry Potter book — multiple publishers rejected it before one finally said yes.',
        'The Harry Potter series has sold more than 600 million copies in over 80 languages, making it the best-selling book series in history.',
        'Rowling created an entire magical world complete with its own sports (Quidditch), schools (Hogwarts), creatures, spells and history.',
        'She is the first author to become a billionaire through writing books, though she later lost that status partly through generous donations to charity.',
      ],
    },
    {
      secret: 'Christopher Columbus',
      hint: 'The Italian explorer who sailed west from Europe and reached the Americas in 1492',
      infoFields: [
        { icon: '🎂', label: 'Born', value: 'c. 1451' },
        { icon: '✝️', label: 'Died', value: '20 May 1506' },
        { icon: '🏆', label: 'Field', value: 'Exploration & Navigation' },
        { icon: '🌍', label: 'Nationality', value: 'Italian (sailed for Spain)' },
      ],
      facts: [
        'Christopher Columbus was born in Genoa, Italy around 1451 and became a skilled sailor and navigator from a young age.',
        'In 1492 he sailed west from Spain with three ships — the Niña, the Pinta, and the Santa María — hoping to reach Asia by going the other way around the world.',
        'Instead he reached the islands of the Caribbean, becoming one of the first Europeans to make contact with the Americas.',
        'Columbus made four voyages to the Americas in total, exploring the Caribbean islands and parts of Central and South America.',
        'His voyages opened the door to centuries of European exploration and settlement in the Americas, changing the history of the entire world.',
      ],
    },
    {
      secret: 'Queen Elizabeth II',
      hint: 'The British monarch who was the longest-reigning queen in history, ruling for 70 years',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '21 April 1926' },
        { icon: '✝️', label: 'Died', value: '8 September 2022' },
        { icon: '🏆', label: 'Field', value: 'Monarchy & Public Service' },
        { icon: '🌍', label: 'Nationality', value: 'British' },
      ],
      facts: [
        'Queen Elizabeth II was born in London in 1926 and became queen in 1952 at the age of 25 when her father King George VI died.',
        'She was the longest-reigning British monarch and the longest-serving female head of state in world history, ruling for 70 years.',
        'During her reign, Britain changed enormously — she saw the creation of the internet, the moon landings, and the end of the British Empire.',
        'She was known for her sense of duty and dedication; she delivered her Christmas message to the nation every single year of her reign without fail.',
        'The Queen was also a skilled horse rider and a passionate fan of horse racing, which she loved her whole life.',
      ],
    },
    {
      secret: 'Princess Diana',
      hint: 'The British princess known as the "People\'s Princess" for her compassion and charity work',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '1 July 1961' },
        { icon: '✝️', label: 'Died', value: '31 August 1997' },
        { icon: '🏆', label: 'Field', value: 'Royalty & Humanitarian Work' },
        { icon: '🌍', label: 'Nationality', value: 'British' },
      ],
      facts: [
        'Princess Diana was born Lady Diana Spencer in Norfolk, England in 1961 and married Prince Charles in 1981 in a ceremony watched by 750 million people worldwide.',
        'She was mother to Princes William and Harry and was famous for her warmth, her ability to connect with ordinary people, and her deep compassion.',
        'Diana shook hands with AIDS patients at a time when many people were afraid to touch them, helping to remove the stigma around the disease.',
        'She walked through minefields in Angola to highlight the danger of landmines and campaigned vigorously for a global ban on them.',
        'She died in a car crash in Paris in 1997 at the age of 36; millions of people around the world mourned her as the "People\'s Princess".',
      ],
    },
    {
      secret: 'Neymar Jr.',
      hint: 'The flamboyant Brazilian footballer famous for his dazzling skills and goal-scoring for Brazil and PSG',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '5 February 1992' },
        { icon: '🏆', label: 'Field', value: 'Football (Soccer)' },
        { icon: '🌍', label: 'Nationality', value: 'Brazilian' },
      ],
      facts: [
        'Neymar Jr. was born in Mogi das Cruzes, Brazil in 1992 and was spotted by scouts for Santos FC when he was just a teenager.',
        'He won the Copa América with Brazil and the Champions League with FC Barcelona, becoming one of the most feared attackers in the world.',
        'In 2017 he moved from Barcelona to Paris Saint-Germain (PSG) for a world-record transfer fee of £198 million.',
        'Neymar is famous for his breathtaking tricks, flicks, and stepovers that leave defenders standing still in confusion.',
        'He represented Brazil at three Olympic Games and won a gold medal on home soil at the 2016 Rio Olympics, becoming a national hero.',
      ],
    },
    {
      secret: 'Serena Williams',
      hint: 'The American tennis champion who won more Grand Slam singles titles than any other player in the Open Era',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '26 September 1981' },
        { icon: '🏆', label: 'Field', value: 'Tennis' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Serena Williams was born in Michigan, USA in 1981 and learned to play tennis on public courts in Compton, California with her father as coach.',
        'She won 23 Grand Slam singles titles — the most by any player in the Open Era of tennis — and topped the world rankings for over 300 weeks.',
        'Serena and her older sister Venus both became world champions, making them one of the greatest sporting families in history.',
        'She returned to win the 2017 Australian Open while in the early stages of pregnancy, showing remarkable determination.',
        'Beyond tennis, Serena became a fashion designer and businesswoman, and is admired worldwide as an icon of strength and perseverance.',
      ],
    },
    {
      secret: 'Michael Jordan',
      hint: 'The American basketball legend who led the Chicago Bulls to six NBA championships and became a global sports icon',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '17 February 1963' },
        { icon: '🏆', label: 'Field', value: 'Basketball' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Michael Jordan was born in Brooklyn, New York in 1963 and was cut from his high school basketball team — a setback he used as motivation to work even harder.',
        'He led the Chicago Bulls to six NBA championships and was named the Finals Most Valuable Player every single time.',
        'Jordan was famous for his incredible ability to jump — fans called him "Air Jordan" — and for his fierce determination to win at all costs.',
        'His Nike Air Jordan trainers, first released in 1985, became one of the best-selling sports shoe lines in history and are still hugely popular today.',
        'He is widely considered the greatest basketball player of all time and helped turn the NBA into a truly global sport.',
      ],
    },
    {
      secret: 'Roger Federer',
      hint: 'The Swiss tennis master whose graceful playing style and 20 Grand Slam titles made him a legend of the sport',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '8 August 1981' },
        { icon: '🏆', label: 'Field', value: 'Tennis' },
        { icon: '🌍', label: 'Nationality', value: 'Swiss' },
      ],
      facts: [
        'Roger Federer was born in Basel, Switzerland in 1981 and fell in love with tennis as a young child, practising for hours every day.',
        'He won 20 Grand Slam singles titles during his career, including a record eight Wimbledon titles on the grass courts he loved most.',
        'Federer was famous not just for winning but for how beautifully he played — his smooth, seemingly effortless strokes made him a joy to watch.',
        'He spent a total of 310 weeks as world number one — the most in history — and is widely regarded as one of the greatest athletes of any sport.',
        'He retired in 2022 at age 41 and his final match at the Laver Cup, alongside rivals-turned-friends Rafael Nadal, was watched by millions.',
      ],
    },
    {
      secret: 'Emma Watson',
      hint: 'The British actress who grew up playing Hermione Granger in Harry Potter and became a UN Women Goodwill Ambassador',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '15 April 1990' },
        { icon: '🏆', label: 'Field', value: 'Acting & Activism' },
        { icon: '🌍', label: 'Nationality', value: 'British' },
      ],
      facts: [
        'Emma Watson was born in Paris, France and grew up in England; she was cast as Hermione Granger in the Harry Potter films at just nine years old.',
        'She appeared in all eight Harry Potter films as the clever, brave witch Hermione, a role that made her one of the most famous young actresses in the world.',
        'Despite her early fame, Watson studied hard and earned a degree in English Literature from Brown University in the USA.',
        'She became a United Nations Goodwill Ambassador for Women and launched the HeForShe campaign to promote gender equality worldwide.',
        'Watson has been a vocal advocate for sustainable and ethical fashion, encouraging people to think about how their clothes are made.',
      ],
    },
    {
      secret: 'Leonardo DiCaprio',
      hint: 'The American actor and passionate environmentalist famous for films like Titanic and The Revenant',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '11 November 1974' },
        { icon: '🏆', label: 'Field', value: 'Acting & Environmentalism' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Leonardo DiCaprio was born in Los Angeles, California in 1974 and appeared in his first TV commercials as a toddler.',
        'He starred in Titanic (1997) which became the highest-grossing film in history at the time and made him the most famous actor on the planet.',
        'After being nominated for an Academy Award four times, he finally won for The Revenant (2016) — and used his acceptance speech to call for action on climate change.',
        'DiCaprio founded the Leonardo DiCaprio Foundation in 1998, which has donated over $100 million to environmental causes around the world.',
        'He is known for preparing intensely for his roles — for The Revenant he reportedly ate raw bison liver and slept inside an animal carcass to survive the cold.',
      ],
    },
    {
      secret: 'Will Smith',
      hint: 'The American actor and rapper who starred in Men in Black and The Fresh Prince of Bel-Air',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '25 September 1968' },
        { icon: '🏆', label: 'Field', value: 'Acting & Music' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Will Smith was born in Philadelphia, USA in 1968 and started his career as a rapper called "The Fresh Prince" before becoming a global film star.',
        'His TV show The Fresh Prince of Bel-Air (1990–96) made him famous around the world and is still loved by fans today.',
        'He has starred in some of the biggest blockbusters in history, including Men in Black, Bad Boys, and Ali.',
        'Smith received Academy Award nominations for Ali and The Pursuit of Happyness, and won the Best Actor Oscar for King Richard in 2022.',
        'He is also a producer, author, and one of the most followed celebrities on social media, famous for his motivational messages and family values.',
      ],
    },
    {
      secret: 'Tom Cruise',
      hint: 'The American action movie star famous for performing his own breathtaking stunts in the Mission: Impossible films',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '3 July 1962' },
        { icon: '🏆', label: 'Field', value: 'Acting' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Tom Cruise was born in Syracuse, New York in 1962 and first became famous in the 1980s with films like Top Gun and Risky Business.',
        'He is famous for doing almost all of his own dangerous stunts — he has learned to fly jets, hang off the side of a plane mid-flight, and scale the Burj Khalifa skyscraper.',
        'His Mission: Impossible franchise has earned over $4 billion worldwide and is known for having some of the most thrilling action sequences in cinema.',
        'Cruise has been nominated for Academy Awards three times and has consistently been one of the highest-paid actors in Hollywood for over 30 years.',
        'Despite being in his 60s, he continues to push the boundaries of what is possible in action films, planning to film a scene in space.',
      ],
    },
    {
      secret: 'Johnny Depp',
      hint: 'The American actor famous for playing eccentric characters like Captain Jack Sparrow in Pirates of the Caribbean',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '9 June 1963' },
        { icon: '🏆', label: 'Field', value: 'Acting' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Johnny Depp was born in Kentucky, USA in 1963 and first became famous on the TV show 21 Jump Street in the 1980s.',
        'His portrayal of the quirky pirate Captain Jack Sparrow in Pirates of the Caribbean (2003) is one of the most beloved characters in film history.',
        'Depp is known for completely transforming himself for roles — he often changes his appearance, voice, and mannerisms to create unforgettable characters.',
        'He has collaborated multiple times with director Tim Burton on dark, quirky films like Edward Scissorhands and Sweeney Todd.',
        'Besides acting, Depp is an accomplished guitarist and has played with rock legends including Aerosmith and Alice Cooper.',
      ],
    },
    {
      secret: 'Justin Bieber',
      hint: 'The Canadian pop star who was discovered through YouTube videos posted as a young teenager and became a global sensation',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '1 March 1994' },
        { icon: '🏆', label: 'Field', value: 'Music' },
        { icon: '🌍', label: 'Nationality', value: 'Canadian' },
      ],
      facts: [
        'Justin Bieber was born in London, Ontario, Canada in 1994 and taught himself to play the drums, guitar, and piano as a young child.',
        'His mother posted videos of him singing covers of popular songs on YouTube when he was around 12; talent manager Scooter Braun discovered him and signed him.',
        'His debut single "One Time" reached the top 30 in ten countries, making him one of the youngest artists ever to achieve such wide international success.',
        'Bieber has sold over 150 million records worldwide, making him one of the best-selling music artists in history.',
        'He married model Hailey Baldwin in 2018 and has spoken publicly about his faith and his struggles with mental health, helping to inspire millions of young fans.',
      ],
    },
    {
      secret: 'Shakira',
      hint: 'The Colombian pop star famous for her unique hip-shaking dance moves and the massive hit Waka Waka',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '2 February 1977' },
        { icon: '🏆', label: 'Field', value: 'Music' },
        { icon: '🌍', label: 'Nationality', value: 'Colombian' },
      ],
      facts: [
        'Shakira Isabel Mebarak Ripoll was born in Barranquilla, Colombia in 1977 and showed an extraordinary talent for music and dance from a tiny age.',
        'She learned to belly dance as a child and later combined it with her unique hip movements, creating a style of dancing that became her trademark.',
        'Her song Waka Waka (This Time for Africa) was the official anthem of the 2010 FIFA World Cup and became one of the best-selling World Cup songs ever.',
        'Shakira sings in both Spanish and English and has sold over 80 million records worldwide, making her one of the best-selling Latin artists in history.',
        'She is also famous for her charity work, founding the Pies Descalzos Foundation to build and support schools for disadvantaged children in Colombia.',
      ],
    },
    {
      secret: 'Madonna',
      hint: 'The American pop star known as the "Queen of Pop" whose reinventions and bold performances changed the music industry',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '16 August 1958' },
        { icon: '🏆', label: 'Field', value: 'Music & Entertainment' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Madonna Louise Ciccone was born in Bay City, Michigan, USA in 1958 and moved to New York City at 19 with just $35 to pursue a career in dance and music.',
        'She burst onto the pop scene in the 1980s with hits like Like a Virgin and Material Girl, becoming one of the biggest stars in the world.',
        'Madonna is famous for constantly reinventing her image and music style — from pop to dance to rock to electronica — staying relevant for over four decades.',
        'She has sold over 300 million records worldwide, making her the best-selling female music artist of all time.',
        'Beyond music, she has starred in films, directed movies, written children\'s books, and run her own entertainment company.',
      ],
    },
    {
      secret: 'Elon Musk',
      hint: 'The South African-born tech billionaire who founded SpaceX and Tesla and bought Twitter',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '28 June 1971' },
        { icon: '🏆', label: 'Field', value: 'Technology & Space Exploration' },
        { icon: '🌍', label: 'Nationality', value: 'South African-American' },
      ],
      facts: [
        'Elon Musk was born in Pretoria, South Africa in 1971 and taught himself to code; he sold his first computer game aged 12 for $500.',
        'He co-founded PayPal, which changed how people pay online, and then founded SpaceX with the goal of eventually sending humans to live on Mars.',
        'His company Tesla made electric cars cool and popular, helping to speed up the world\'s move away from petrol-powered vehicles.',
        'SpaceX developed reusable rockets that land themselves after launch — a breakthrough that dramatically reduced the cost of getting to space.',
        'He became the world\'s richest person on multiple occasions and is known for his ambitious and sometimes controversial ideas about technology and the future.',
      ],
    },
    {
      secret: 'Donald Trump',
      hint: 'The American businessman and TV personality who became the 45th and 47th President of the United States',
      infoFields: [
        { icon: '🎂', label: 'Born', value: '14 June 1946' },
        { icon: '🏆', label: 'Field', value: 'Business & Politics' },
        { icon: '🌍', label: 'Nationality', value: 'American' },
      ],
      facts: [
        'Donald John Trump was born in Queens, New York in 1946 and built a career as a real estate developer, constructing hotels, casinos, and skyscrapers.',
        'He hosted the popular US TV show The Apprentice from 2004, in which contestants competed for a job at his company, and his catchphrase "You\'re fired!" became famous worldwide.',
        'Trump ran for US President in 2016 as the Republican candidate and defeated Hillary Clinton in a surprise result that shocked the world.',
        'He became the first US President to be impeached twice by the House of Representatives, though he was not convicted either time by the Senate.',
        'After losing the 2020 election to Joe Biden, he ran again in 2024 and won, making him only the second person in American history to serve as president for two non-consecutive terms.',
      ],
    },
  ],
  famous_places: [
    {
      secret: 'Eiffel Tower',
      hint: 'The tall iron tower built for a world fair in Paris that became France\'s most iconic landmark',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Paris, France' },
        { icon: '🏛️', label: 'Type', value: 'Iron Tower & Monument' },
        { icon: '📅', label: 'Built', value: '1889' },
      ],
      facts: [
        'The Eiffel Tower was built in Paris, France, between 1887 and 1889 for the World\'s Fair celebrating 100 years since the French Revolution.',
        'It stands about 330 metres tall — taller than a 70-storey building — and was the world\'s tallest man-made structure for 41 years.',
        'The tower is made of about 18,000 iron parts held together by 2.5 million rivets, and it was built in under two years.',
        'About 7 million people visit every year, making it the most visited paid monument in the world.',
        'The tower is repainted every seven years to protect it from rust, and it actually grows about 15 cm taller in summer when the iron expands in the heat.',
      ],
    },
    {
      secret: 'Great Wall of China',
      hint: 'The ancient stone wall stretching thousands of kilometres across northern China, built to keep out invaders',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Northern China' },
        { icon: '🏛️', label: 'Type', value: 'Fortification Wall' },
        { icon: '📅', label: 'Built', value: 'Started c. 221 BC' },
      ],
      facts: [
        'The Great Wall of China is a series of walls and fortifications built over many centuries, mainly to protect China from northern invaders.',
        'It stretches about 21,000 kilometres in total — long enough to go halfway around the Earth.',
        'Construction started more than 2,000 years ago and continued through several dynasties; millions of workers, including soldiers and prisoners, helped build it.',
        'Contrary to the popular myth, you cannot actually see the Great Wall from space with the naked eye — it is too thin compared to its length.',
        'The wall is a UNESCO World Heritage Site and attracts around 10 million visitors every year.',
      ],
    },
    {
      secret: 'Pyramids of Giza',
      hint: 'The enormous ancient stone structures built as tombs for Egyptian pharaohs near Cairo',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Giza, Egypt' },
        { icon: '🏛️', label: 'Type', value: 'Royal Tombs' },
        { icon: '📅', label: 'Built', value: 'c. 2580–2510 BC' },
      ],
      facts: [
        'The Pyramids of Giza were built in Egypt around 4,500 years ago as giant tombs for the pharaohs Khufu, Khafre, and Menkaure.',
        'The Great Pyramid of Khufu is made of about 2.3 million stone blocks, each weighing on average as much as a car.',
        'The Great Pyramid was the tallest man-made structure in the world for nearly 4,000 years — a record that lasted until the Eiffel Tower was built.',
        'Scientists still debate exactly how the ancient Egyptians moved and lifted such enormous stones without modern machinery.',
        'The nearby Great Sphinx — a massive statue with a human head and lion body — stands guard over the pyramid complex.',
      ],
    },
    {
      secret: 'Taj Mahal',
      hint: 'The stunning white marble mausoleum in India built by an emperor as a symbol of love for his wife',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Agra, India' },
        { icon: '🏛️', label: 'Type', value: 'Marble Mausoleum' },
        { icon: '📅', label: 'Built', value: 'Completed 1653' },
      ],
      facts: [
        'The Taj Mahal is located in Agra, India, and was built by Mughal Emperor Shah Jahan starting in 1632 as a tomb for his beloved wife Mumtaz Mahal.',
        'It took about 20,000 workers and craftsmen over 20 years to complete the building, which is made almost entirely of white marble.',
        'The white marble appears to change colour depending on the time of day — pinkish at dawn, white at midday, and golden by moonlight.',
        'The Taj Mahal is a UNESCO World Heritage Site and is considered one of the most beautiful buildings ever created.',
        'Around 7–8 million tourists visit each year, making it one of India\'s most popular attractions.',
      ],
    },
    {
      secret: 'Mount Everest',
      hint: 'The highest mountain on Earth, located in the Himalayas on the border of Nepal and Tibet',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Nepal / Tibet border' },
        { icon: '🏛️', label: 'Type', value: 'Natural Mountain' },
        { icon: '📅', label: 'Age', value: '~60 million years old' },
      ],
      facts: [
        'Mount Everest stands at 8,849 metres above sea level — the highest point on Earth — and sits on the border between Nepal and Tibet.',
        'It was first climbed on 29 May 1953 by New Zealander Edmund Hillary and Nepali Sherpa Tenzing Norgay.',
        'The mountain is named after British surveyor George Everest, who helped map South Asia in the 19th century.',
        'At the summit, the air has only about one third of the oxygen found at sea level, so most climbers carry oxygen tanks.',
        'More than 6,000 people have reached the summit, but the climb is very dangerous — high winds, extreme cold and altitude sickness make it a serious challenge.',
      ],
    },
    {
      secret: 'Amazon Rainforest',
      hint: 'The vast tropical jungle in South America that is home to the greatest variety of wildlife on Earth',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'South America' },
        { icon: '🏛️', label: 'Type', value: 'Tropical Rainforest' },
        { icon: '📅', label: 'Age', value: '~55 million years old' },
      ],
      facts: [
        'The Amazon Rainforest covers about 5.5 million square kilometres — roughly the same size as the whole of Australia.',
        'It is home to about 10% of all species on Earth, including over 40,000 plant species, 1,300 bird species, and 3,000 types of fish.',
        'The Amazon River, which flows through the forest, carries more water than any other river in the world.',
        'Scientists believe there are still indigenous tribes living in the Amazon who have never had contact with the outside world.',
        'The forest produces so much oxygen and absorbs so much carbon dioxide that it is often called "the lungs of the Earth".',
      ],
    },
    {
      secret: 'Statue of Liberty',
      hint: 'The giant copper statue of a woman holding a torch that stands in New York Harbour as a symbol of freedom',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'New York Harbour, USA' },
        { icon: '🏛️', label: 'Type', value: 'Copper Statue' },
        { icon: '📅', label: 'Built', value: '1886' },
      ],
      facts: [
        'The Statue of Liberty was a gift from France to the United States and was unveiled on 28 October 1886.',
        'She stands about 93 metres tall from the ground to the tip of her torch and weighs about 225 tonnes.',
        'The statue was designed by French sculptor Frédéric Auguste Bartholdi, and her iron framework was built by the same engineer who later designed the Eiffel Tower.',
        'The statue has turned green over the years because of a chemical reaction called oxidation — the copper surface reacting with air and water.',
        'Millions of immigrants arriving by ship to America saw the statue as their first glimpse of their new homeland, making her a powerful symbol of hope and freedom.',
      ],
    },
    {
      secret: 'Great Barrier Reef',
      hint: 'The world\'s largest coral reef system off the coast of Australia, visible from space',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Queensland, Australia' },
        { icon: '🏛️', label: 'Type', value: 'Coral Reef System' },
        { icon: '📅', label: 'Age', value: '~8,000 years old' },
      ],
      facts: [
        'The Great Barrier Reef is located off the coast of Queensland, Australia, and stretches over 2,300 kilometres — the largest living structure on Earth.',
        'It is made up of more than 2,900 individual reefs and 900 islands, and is home to over 1,500 species of fish and 4,000 species of mollusc.',
        'The reef is so large it can be seen from outer space, and it has been a UNESCO World Heritage Site since 1981.',
        'Coral bleaching caused by rising ocean temperatures is a serious threat; large parts of the reef have been damaged in recent decades.',
        'About 2 million people visit the Great Barrier Reef each year to snorkel and dive among its extraordinary colours and wildlife.',
      ],
    },
    {
      secret: 'Big Ben',
      hint: 'The giant clock tower at the Houses of Parliament in London, one of the world\'s most famous landmarks',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'London, England' },
        { icon: '🏛️', label: 'Type', value: 'Clock Tower' },
        { icon: '📅', label: 'Built', value: '1859' },
      ],
      facts: [
        'Big Ben is actually the nickname for the huge bell inside the clock tower at the end of the Houses of Parliament in London, England.',
        'The tower itself was renamed the Elizabeth Tower in 2012 to honour Queen Elizabeth II\'s 60 years on the throne.',
        'The clock was completed in 1859 and its four clock faces are each about 7 metres wide — big enough to fit a double-decker bus inside each one.',
        'The bell weighs about 13.5 tonnes — as heavy as two large elephants — and its chime can be heard up to a kilometre away.',
        'Big Ben survived the London Blitz during World War II with only minor damage and has been chiming the hours reliably ever since.',
      ],
    },
    {
      secret: 'Grand Canyon',
      hint: 'The enormous gorge carved by the Colorado River in Arizona, USA — one of the natural wonders of the world',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Arizona, USA' },
        { icon: '🏛️', label: 'Type', value: 'Natural Gorge' },
        { icon: '📅', label: 'Age', value: '~5–6 million years old' },
      ],
      facts: [
        'The Grand Canyon is located in Arizona, USA, and was carved over millions of years by the Colorado River cutting through layers of rock.',
        'It is about 446 kilometres long, up to 29 kilometres wide, and over 1.6 kilometres deep — so deep you could stack four Eiffel Towers inside it.',
        'The canyon walls reveal nearly two billion years of Earth\'s geological history in their colourful rock layers.',
        'About 5 to 6 million people visit the Grand Canyon every year, and it became a UNESCO World Heritage Site in 1979.',
        'Several Native American tribes, including the Havasupai, have lived in and around the canyon for thousands of years and consider it sacred.',
      ],
    },
    {
      secret: 'Niagara Falls',
      hint: 'The thundering waterfalls on the border of Canada and the USA, famous for their incredible power and mist',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'USA / Canada border' },
        { icon: '🏛️', label: 'Type', value: 'Waterfalls' },
        { icon: '📅', label: 'Age', value: '~12,000 years old' },
      ],
      facts: [
        'Niagara Falls sits on the border between the Canadian province of Ontario and the US state of New York and is actually made up of three separate waterfalls.',
        'More than 3,000 tonnes of water pour over the falls every single second — enough to fill more than 1,000 bathtubs in the blink of an eye.',
        'The mist from the falls rises so high it can be seen from many kilometres away, and on sunny days it creates beautiful rainbows.',
        'Niagara Falls has been used to generate electricity since 1881, and today the hydro-electric plants there produce power for millions of homes.',
        'Over the years, daredevils have tried to go over the falls in barrels or walk across them on tightropes — some succeeded, but it is extremely dangerous.',
      ],
    },
    {
      secret: 'Golden Gate Bridge',
      hint: 'The iconic bright orange suspension bridge spanning the entrance to San Francisco Bay in California',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'San Francisco, USA' },
        { icon: '🏛️', label: 'Type', value: 'Suspension Bridge' },
        { icon: '📅', label: 'Built', value: '1937' },
      ],
      facts: [
        'The Golden Gate Bridge spans the Golden Gate Strait, the opening of San Francisco Bay into the Pacific Ocean, in California, USA.',
        'It was completed in 1937 and at the time was the longest and tallest suspension bridge in the world, with towers as tall as a 65-storey building.',
        'Despite its name, the bridge is painted a distinctive orange-red colour called "International Orange" — chosen because it blends beautifully with the surrounding hills.',
        'The bridge is about 2.7 kilometres long and is suspended by two massive cables, each made of 27,572 individual steel wires twisted together.',
        'About 10 million people visit the Golden Gate Bridge each year and around 112,000 vehicles cross it every single day.',
      ],
    },
    {
      secret: 'Burj Khalifa',
      hint: 'The skyscraper in Dubai that is the tallest building in the world, soaring over half a kilometre into the sky',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Dubai, UAE' },
        { icon: '🏛️', label: 'Type', value: 'Skyscraper' },
        { icon: '📅', label: 'Built', value: '2010' },
      ],
      facts: [
        'The Burj Khalifa in Dubai, United Arab Emirates, stands at 828 metres tall — the tallest building ever constructed by humans.',
        'It has 163 floors and took about six years to build, opening on 4 January 2010; at its peak, 12,000 workers were on the construction site every day.',
        'The tower is so tall that you can see the sun set from the ground floor, then take the lift to the top floor and watch the sun set again.',
        'Tom Cruise famously dangled from the side of the Burj Khalifa for the film Mission: Impossible — Ghost Protocol, without any computer graphics.',
        'On New Year\'s Eve, the Burj Khalifa hosts one of the world\'s most spectacular fireworks and light shows, watched by millions around the globe.',
      ],
    },
    {
      secret: 'Disneyland',
      hint: 'The magical theme park created by Walt Disney in California that calls itself the "Happiest Place on Earth"',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Anaheim, California, USA' },
        { icon: '🏛️', label: 'Type', value: 'Theme Park' },
        { icon: '📅', label: 'Opened', value: '1955' },
      ],
      facts: [
        'Disneyland opened in Anaheim, California on 17 July 1955 — Walt Disney\'s dream of a place where families could have fun together came true.',
        'The park was built in just 366 days and on opening day some rides broke down, but it has since grown into one of the most visited places on Earth.',
        'Disneyland is divided into themed lands such as Fantasyland, Adventureland, and Tomorrowland, each with its own rides, characters, and decorations.',
        'Cinderella\'s and Sleeping Beauty\'s castles, which stand at the heart of Disney parks, are recognisable to children in almost every country in the world.',
        'More than 700 million people have visited Disneyland parks around the world since 1955, making it one of the most popular tourist destinations in history.',
      ],
    },
    {
      secret: 'Universal Studios',
      hint: 'The famous film studio theme park where visitors can step inside their favourite movies and TV shows',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Hollywood, California, USA' },
        { icon: '🏛️', label: 'Type', value: 'Film Studio & Theme Park' },
        { icon: '📅', label: 'Founded', value: '1915' },
      ],
      facts: [
        'Universal Studios began as a real working film studio in Hollywood, California in 1915 — one of the oldest and largest movie studios in the world.',
        'The Universal Studios theme parks let visitors experience rides and attractions based on films like Jurassic Park, Harry Potter, and Fast & Furious.',
        'The Wizarding World of Harry Potter, which opened in Universal Orlando in 2010, is one of the most popular theme park attractions ever built.',
        'There are Universal Studios parks in Hollywood, Orlando, Singapore, Japan, and Beijing, entertaining tens of millions of visitors every year.',
        'Some rides use cutting-edge technology like 4K screens, motion simulators, and real water effects to make guests feel like they are inside the movie.',
      ],
    },
    {
      secret: 'The Colosseum',
      hint: 'The giant oval amphitheatre in Rome, Italy, where ancient Romans watched gladiator battles and other spectacular events',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Rome, Italy' },
        { icon: '🏛️', label: 'Type', value: 'Amphitheatre' },
        { icon: '📅', label: 'Built', value: 'c. 80 AD' },
      ],
      facts: [
        'The Colosseum in Rome, Italy was completed around 80 AD and could hold between 50,000 and 80,000 spectators — about the size of a modern football stadium.',
        'It was used for gladiator fights, animal hunts, public executions, and even mock naval battles with the arena flooded with water.',
        'The Colosseum is made of about 100,000 cubic metres of travertine stone and held together by around 300 tonnes of iron clamps.',
        'It is the largest amphitheatre ever built and remains the most iconic symbol of the Roman Empire and its engineering skill.',
        'Today it is Italy\'s most visited monument, attracting around 7 million visitors each year, and it appears on the Italian version of the €1 coin.',
      ],
    },
    {
      secret: 'Buckingham Palace',
      hint: 'The official London home of the British Royal Family, famous for its grand facade and the Changing of the Guard ceremony',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'London, England' },
        { icon: '🏛️', label: 'Type', value: 'Royal Palace' },
        { icon: '📅', label: 'Built', value: '1703 (remodelled 1826)' },
      ],
      facts: [
        'Buckingham Palace has been the official residence of the British monarch in London since 1837, when Queen Victoria moved in.',
        'The palace has 775 rooms including 19 State Rooms, 52 royal and guest bedrooms, 188 staff bedrooms, 92 offices and 78 bathrooms.',
        'The famous Changing of the Guard ceremony takes place in the palace forecourt, where soldiers in red uniforms and tall black fur hats swap duties.',
        'If the Royal Standard flag is flying above the palace, it means the King or Queen is at home; if the Union Jack flies, they are away.',
        'The palace gardens cover about 16 hectares and include a lake, a tennis court, and a helicopter landing pad — and are home to 30 species of bird.',
      ],
    },
    {
      secret: 'Champs-Élysées',
      hint: 'The famous wide boulevard in Paris lined with shops, cafés and trees, leading to the Arc de Triomphe',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Paris, France' },
        { icon: '🏛️', label: 'Type', value: 'Famous Boulevard' },
        { icon: '📅', label: 'Laid out', value: '1667' },
      ],
      facts: [
        'The Champs-Élysées is a famous avenue in Paris, France, running for about 1.9 kilometres from the Place de la Concorde to the Arc de Triomphe.',
        'Its name means "Elysian Fields" in French — the paradise in Greek mythology where heroic souls go after death.',
        'It is often called the most beautiful avenue in the world and is home to luxury shops, theatres, cafés, and flagship car showrooms.',
        'Every year the Tour de France — the world\'s most famous cycling race — finishes with a spectacular final stage along the Champs-Élysées.',
        'On Bastille Day (14 July) France holds its national military parade down the Champs-Élysées, with thousands of soldiers, aircraft and tanks.',
      ],
    },
    {
      secret: 'Stonehenge',
      hint: 'The mysterious circle of enormous ancient standing stones on Salisbury Plain in England, built thousands of years ago',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Wiltshire, England' },
        { icon: '🏛️', label: 'Type', value: 'Prehistoric Monument' },
        { icon: '📅', label: 'Built', value: 'c. 3000–1500 BC' },
      ],
      facts: [
        'Stonehenge is a prehistoric monument on Salisbury Plain in Wiltshire, England, built in several stages between about 3000 BC and 1500 BC.',
        'The largest stones — called sarsens — weigh up to 25 tonnes each and were transported from a quarry about 25 kilometres away without any modern machines.',
        'Scientists still debate exactly how and why Stonehenge was built; theories include it being a burial site, a place of healing, or an astronomical calendar.',
        'At the summer solstice (the longest day of the year), the rising sun aligns perfectly with the stones — suggesting Stonehenge was used to track the seasons.',
        'Stonehenge is one of the most famous prehistoric monuments in the world, attracting about 1.5 million visitors every year.',
      ],
    },
    {
      secret: 'Notre-Dame Cathedral',
      hint: 'The magnificent medieval Gothic cathedral on an island in the River Seine in the heart of Paris',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Paris, France' },
        { icon: '🏛️', label: 'Type', value: 'Gothic Cathedral' },
        { icon: '📅', label: 'Completed', value: 'c. 1345' },
      ],
      facts: [
        'Notre-Dame de Paris is a medieval Catholic cathedral on the Île de la Cité in the River Seine, and one of the finest examples of Gothic architecture in the world.',
        'Construction began in 1163 and took about 200 years to complete; it was so ambitious that the builders invented a new engineering technique — the flying buttress — to hold up the walls.',
        'The cathedral is famous for its stunning rose windows filled with coloured stained glass, its tall spire, and its stone gargoyles peering down from the walls.',
        'In April 2019 a devastating fire destroyed the spire and much of the roof, but millions of people around the world donated money to help rebuild it.',
        'Notre-Dame is one of the most visited monuments in the world, welcoming around 13 million visitors each year before the fire.',
      ],
    },
    {
      secret: 'Alhambra Palace',
      hint: 'The breathtaking Moorish palace and fortress complex in Granada, Spain, famous for its intricate Islamic architecture',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Granada, Spain' },
        { icon: '🏛️', label: 'Type', value: 'Moorish Palace & Fortress' },
        { icon: '📅', label: 'Built', value: '13th–14th century' },
      ],
      facts: [
        'The Alhambra is a palace and fortress complex in Granada, southern Spain, built mainly in the 13th and 14th centuries by the Moorish rulers of the region.',
        'Its name means "the red one" in Arabic, likely referring to the reddish colour of its outer walls made from clay and sand.',
        'Inside, the palace is decorated with extraordinarily detailed geometric patterns, Arabic calligraphy, and beautiful tilework — some of the finest Islamic art in the world.',
        'The famous Court of the Lions features a fountain supported by 12 carved marble lions, surrounded by a stunning arcaded courtyard.',
        'The Alhambra was declared a UNESCO World Heritage Site in 1984 and is Spain\'s most visited monument, attracting about 2.7 million visitors each year.',
      ],
    },
    {
      secret: 'Cappadocia',
      hint: 'The magical region in Turkey famous for its fairy chimneys, underground cities and hot-air balloon rides at sunrise',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Central Turkey' },
        { icon: '🏛️', label: 'Type', value: 'Natural & Historic Region' },
        { icon: '📅', label: 'Age', value: 'Landscape ~3 million years old' },
      ],
      facts: [
        'Cappadocia is a region in central Turkey famous for its extraordinary landscape of cone-shaped rock formations known as "fairy chimneys," carved by millions of years of volcanic eruptions and erosion.',
        'Ancient people carved homes, churches, and entire underground cities into the soft volcanic rock — some of these underground cities could house thousands of people and their animals.',
        'Every morning at sunrise, hundreds of colourful hot-air balloons float over Cappadocia\'s valleys and rock formations in one of the most spectacular sights on Earth.',
        'The region is also home to beautiful cave hotels where guests sleep inside rooms carved directly into the rock, some of which are thousands of years old.',
        'Cappadocia was a key stop on the ancient Silk Road trade route connecting Asia to Europe, and has been home to many different civilisations over thousands of years.',
      ],
    },
    {
      secret: 'The Pacific Ocean',
      hint: 'The largest and deepest ocean on Earth, covering more than a third of the planet\'s entire surface',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'Between Asia/Australia & the Americas' },
        { icon: '🏛️', label: 'Type', value: 'Ocean' },
        { icon: '📅', label: 'Age', value: '~250 million years old' },
      ],
      facts: [
        'The Pacific Ocean is the largest ocean on Earth, covering about 165 million square kilometres — bigger than all of Earth\'s land combined.',
        'It is also the deepest ocean; the Mariana Trench in the western Pacific reaches nearly 11 kilometres below the surface — the deepest point on Earth.',
        'The Pacific Ocean contains more than half of the world\'s ocean water and is home to an enormous variety of sea life, from tiny plankton to the blue whale.',
        'Its name comes from the Portuguese explorer Ferdinand Magellan, who called it the "peaceful sea" (Mar Pacifico) because the waters were calm when he crossed it in 1521.',
        'The Ring of Fire, a horseshoe-shaped zone around the Pacific\'s edges, contains about 75% of the world\'s volcanoes and is responsible for most of its major earthquakes.',
      ],
    },
    {
      secret: 'Antarctica',
      hint: 'The frozen continent at the South Pole, the coldest, windiest and driest place on Earth',
      infoFields: [
        { icon: '📍', label: 'Location', value: 'South Pole' },
        { icon: '🏛️', label: 'Type', value: 'Frozen Continent' },
        { icon: '📅', label: 'Age', value: 'Ice sheet ~34 million years old' },
      ],
      facts: [
        'Antarctica is the fifth-largest continent and sits at the South Pole; it is almost entirely covered by an ice sheet up to 4.8 kilometres thick.',
        'It is the coldest place on Earth — the lowest temperature ever recorded was −89.2°C at the Soviet Vostok Station in 1983.',
        'Antarctica is technically a desert because it receives very little precipitation; the interior gets less annual snowfall than the Sahara Desert gets rain.',
        'About 98% of Antarctica is covered by ice, which holds about 60% of the world\'s fresh water — if it all melted, sea levels worldwide would rise by about 60 metres.',
        'No country owns Antarctica; under the 1959 Antarctic Treaty it is protected as a scientific preserve and military activity is banned there.',
      ],
    },
  ],
  movies_cartoons: [
    {
      secret: 'Simba',
      hint: 'The lion prince from Disney\'s The Lion King who must reclaim his kingdom after his father is killed',
      infoFields: [
        { icon: '📅', label: 'Released', value: '1994' },
        { icon: '🎬', label: 'Type', value: 'Animated Film' },
        { icon: '🏢', label: 'Studio', value: 'Walt Disney Animation' },
      ],
      facts: [
        'Simba is the main character of Disney\'s The Lion King (1994), one of the highest-grossing animated films ever made.',
        'His story is inspired by Shakespeare\'s Hamlet — a prince who runs away after his father is killed by a treacherous relative.',
        'The name "Simba" means "lion" in Swahili, the language spoken across much of East Africa.',
        'The Lion King\'s soundtrack was written by Elton John and Tim Rice; the song "Circle of Life" opens the film with one of cinema\'s most memorable scenes.',
        'A photo-realistic computer-animated remake of The Lion King was released in 2019 and became one of the highest-grossing films of all time.',
      ],
    },
    {
      secret: 'Elsa',
      hint: 'The ice-powered queen from Disney\'s Frozen who sings "Let It Go" and can create blizzards with her hands',
      infoFields: [
        { icon: '📅', label: 'Released', value: '2013' },
        { icon: '🎬', label: 'Type', value: 'Animated Film' },
        { icon: '🏢', label: 'Studio', value: 'Walt Disney Animation' },
      ],
      facts: [
        'Elsa is the main character of Disney\'s Frozen (2013), which became the highest-grossing animated film of its time.',
        'She is inspired by the Snow Queen, a character from a fairy tale by Danish author Hans Christian Andersen.',
        'Her signature song "Let It Go" won the Academy Award for Best Original Song and was recorded in 42 different languages.',
        'Unlike most Disney films of the time, Frozen focused on the bond between two sisters — Elsa and Anna — rather than a romantic story.',
        'Frozen was so popular that it became the first animated film to earn over $1 billion at the box office, and a sequel, Frozen 2, was released in 2019.',
      ],
    },
    {
      secret: 'SpongeBob SquarePants',
      hint: 'The cheerful yellow sea sponge who lives in a pineapple under the sea and works as a fry cook',
      infoFields: [
        { icon: '📅', label: 'First aired', value: '1999' },
        { icon: '🎬', label: 'Type', value: 'Animated TV Show' },
        { icon: '🏢', label: 'Network', value: 'Nickelodeon' },
      ],
      facts: [
        'SpongeBob SquarePants first appeared on Nickelodeon in 1999 and was created by marine science educator Stephen Hillenburg.',
        'He lives in an underwater city called Bikini Bottom in a house shaped like a pineapple, with his best friend Patrick the starfish next door.',
        'Despite being a fry cook at the Krabby Patty restaurant, SpongeBob is the most enthusiastic and cheerful character in his neighbourhood.',
        'The show became a global cultural phenomenon; SpongeBob memes and references have spread widely across the internet.',
        'Stephen Hillenburg was a real marine biologist before becoming an animator, which is why the underwater world in the show is full of accurate sea creatures.',
      ],
    },
    {
      secret: 'Harry Potter',
      hint: 'The boy wizard with a lightning-bolt scar who discovers he is famous in the magical world',
      infoFields: [
        { icon: '📅', label: 'Books from', value: '1997 · Films from 2001' },
        { icon: '🎬', label: 'Type', value: 'Fantasy Film Series' },
        { icon: '🏢', label: 'Studio', value: 'Warner Bros.' },
      ],
      facts: [
        'Harry Potter is the hero of seven novels written by J.K. Rowling, starting with Harry Potter and the Philosopher\'s Stone (1997).',
        'He discovers on his 11th birthday that he is a wizard and is accepted into Hogwarts School of Witchcraft and Wizardry.',
        'Harry is famous in the wizarding world because as a baby he survived an attack by the dark wizard Voldemort, leaving a lightning-bolt scar on his forehead.',
        'The Harry Potter series has sold over 500 million copies worldwide, making it the best-selling book series in history.',
        'The eight Harry Potter films together earned over $7.7 billion at the box office, and the franchise continues with theme parks, stage plays and spin-off films.',
      ],
    },
    {
      secret: 'Woody',
      hint: 'The cowboy pull-string toy who is Andy\'s favourite in Disney Pixar\'s Toy Story',
      infoFields: [
        { icon: '📅', label: 'Released', value: '1995' },
        { icon: '🎬', label: 'Type', value: 'Animated Film' },
        { icon: '🏢', label: 'Studio', value: 'Pixar / Disney' },
      ],
      facts: [
        'Woody is the main character of the Toy Story franchise (1995–2019), the beloved Pixar series about toys that come to life when humans are not watching.',
        'He is a pull-string cowboy doll and Andy\'s favourite toy — until a flashy new space ranger called Buzz Lightyear arrives.',
        'Woody\'s catchphrase is "There\'s a snake in my boot!" — one of several phrases he says when his pull-string is yanked.',
        'The original Toy Story (1995) was the first feature film ever made entirely with computer animation — a landmark moment in film history.',
        'Throughout the series, Woody\'s greatest fear is being abandoned or thrown away, which drives much of the emotional story.',
      ],
    },
    {
      secret: 'Shrek',
      hint: 'The grumpy green ogre who lives in a swamp and goes on a quest to rescue a princess',
      infoFields: [
        { icon: '📅', label: 'Released', value: '2001' },
        { icon: '🎬', label: 'Type', value: 'Animated Film' },
        { icon: '🏢', label: 'Studio', value: 'DreamWorks Animation' },
      ],
      facts: [
        'Shrek is the main character of DreamWorks Animation\'s Shrek (2001) and its sequels, based on a picture book by William Steig.',
        'He is a large, grumpy green ogre who just wants to be left alone in his swamp, but ends up on a quest to rescue Princess Fiona with a talking donkey as his companion.',
        'The first Shrek film won the very first Academy Award for Best Animated Feature when that category was created in 2002.',
        'Shrek subverted fairy-tale traditions by making the "monster" the hero and showing that beauty is not what it seems — Fiona turns out to be an ogre herself.',
        'The Shrek franchise has earned over $3.5 billion worldwide and became one of the most popular animated series ever made.',
      ],
    },
    {
      secret: 'Nemo',
      hint: 'The little clownfish with a small fin who gets lost in the ocean while his worried dad swims across the sea to find him',
      infoFields: [
        { icon: '📅', label: 'Released', value: '2003' },
        { icon: '🎬', label: 'Type', value: 'Animated Film' },
        { icon: '🏢', label: 'Studio', value: 'Pixar / Disney' },
      ],
      facts: [
        'Nemo is the main character of Pixar\'s Finding Nemo (2003), a film about a father\'s incredible journey to rescue his son.',
        'He is a clownfish with one small fin — called a "lucky fin" by his dad Marlin — who gets scooped up by a scuba diver and taken to a fish tank in a Sydney dentist\'s office.',
        'Clownfish really do live among the stinging tentacles of sea anemones, which protect them from predators.',
        'Finding Nemo was the best-selling DVD of all time when it was released and held that record for many years.',
        'A sequel, Finding Dory (2016), follows Nemo\'s forgetful blue tang friend Dory as she searches for her own family.',
      ],
    },
    {
      secret: 'Moana',
      hint: 'The brave Polynesian teenager who sails across the ocean to restore the heart of the goddess Te Fiti',
      infoFields: [
        { icon: '📅', label: 'Released', value: '2016' },
        { icon: '🎬', label: 'Type', value: 'Animated Film' },
        { icon: '🏢', label: 'Studio', value: 'Walt Disney Animation' },
      ],
      facts: [
        'Moana is the main character of Disney\'s Moana (2016), a film inspired by the seafaring cultures of Polynesia.',
        'She is the daughter of the chief of the island of Motunui and is chosen by the ocean to return the stolen heart of the goddess Te Fiti.',
        'Disney researchers spent years studying Pacific Island cultures, visiting Fiji, Samoa, Tahiti and other islands to make the film as accurate as possible.',
        'The ocean itself acts as a character in the film, helping and guiding Moana on her journey.',
        'The film\'s songs were written with the help of Lin-Manuel Miranda, the creator of the Broadway musical Hamilton, making the soundtrack full of energy.',
      ],
    },
  ],
  animals_nature: [
    {
      secret: 'Blue Whale',
      hint: 'The largest animal ever known to have lived on Earth — a giant ocean creature whose heart is the size of a small car',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Marine Mammal' },
        { icon: '🌿', label: 'Habitat', value: 'All oceans worldwide' },
        { icon: '⚠️', label: 'Status', value: 'Endangered' },
      ],
      facts: [
        'The blue whale is the largest animal known to have ever existed on Earth, reaching lengths of up to 30 metres and weights of up to 200 tonnes.',
        'Its heart is about the size of a small car, and a human could crawl through its main blood vessels.',
        'Despite being so enormous, blue whales eat almost nothing but tiny shrimp-like creatures called krill — they can swallow about 4 tonnes of krill per day.',
        'Blue whales communicate with deep rumbling sounds that can travel thousands of kilometres through the ocean.',
        'They were hunted nearly to extinction during the 20th century; today they are protected, but their numbers are still very low.',
      ],
    },
    {
      secret: 'Cheetah',
      hint: 'The world\'s fastest land animal, capable of reaching 100 km/h in just a few seconds',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Big Cat (Mammal)' },
        { icon: '🌿', label: 'Habitat', value: 'African savannah & grasslands' },
        { icon: '⚠️', label: 'Status', value: 'Vulnerable' },
      ],
      facts: [
        'The cheetah is the fastest land animal, reaching speeds of up to 112 km/h during short chases after prey.',
        'It can accelerate from 0 to 100 km/h in just about 3 seconds — faster than most sports cars.',
        'Unlike other big cats, cheetahs cannot roar. Instead they purr, chirp and make bird-like chirruping sounds.',
        'A cheetah\'s distinctive black "tear marks" running from its eyes to its mouth help reduce glare from the sun when hunting.',
        'Cheetahs are now an endangered species; fewer than 7,000 are estimated to remain in the wild, mostly in sub-Saharan Africa.',
      ],
    },
    {
      secret: 'Giant Panda',
      hint: 'The black-and-white bear from China that has become one of the world\'s most beloved symbols of wildlife conservation',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Bear (Mammal)' },
        { icon: '🌿', label: 'Habitat', value: 'Central China mountain forests' },
        { icon: '⚠️', label: 'Status', value: 'Vulnerable' },
      ],
      facts: [
        'Giant pandas live in the mountain forests of central China and are famous for their distinctive black-and-white colouring.',
        'They eat almost nothing but bamboo — up to 14 kg a day — and spend about 12 hours a day just eating to get enough energy.',
        'Giant pandas have a special wrist bone that works a bit like a thumb, helping them grip bamboo stalks.',
        'For a long time giant pandas were classified as endangered; thanks to conservation efforts in China, they were reclassified as "vulnerable" in 2016.',
        'Giant pandas are very rare in the wild; there are fewer than 2,000 remaining, all in China. They are a symbol of conservation worldwide.',
      ],
    },
    {
      secret: 'Tyrannosaurus Rex',
      hint: 'The fearsome giant meat-eating dinosaur with tiny arms and enormous jaws that ruled the Late Cretaceous period',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Theropod Dinosaur' },
        { icon: '🌿', label: 'Habitat', value: 'North America (prehistoric)' },
        { icon: '⚠️', label: 'Status', value: 'Extinct (~66 million years ago)' },
      ],
      facts: [
        'Tyrannosaurus Rex lived about 66–68 million years ago and was one of the largest meat-eating dinosaurs ever to walk the Earth.',
        'It could grow up to 12 metres long and weigh about 8 tonnes — heavier than an African elephant.',
        'Despite its terrifying reputation, scientists now believe T. rex may have had feathers on parts of its body, similar to modern birds.',
        'Its tiny arms were actually quite strong and may have been used to grip prey, but they were so short they could not reach its own mouth.',
        'T. rex is one of the most studied dinosaurs ever; new fossils are discovered fairly regularly, and scientists are always learning new things about it.',
      ],
    },
    {
      secret: 'Polar Bear',
      hint: 'The world\'s largest land carnivore, a white bear that lives on Arctic sea ice and swims long distances in freezing water',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Mammal' },
        { icon: '🌿', label: 'Habitat', value: 'Arctic Circle' },
        { icon: '⚠️', label: 'Status', value: 'Vulnerable' },
      ],
      facts: [
        'Polar bears are the world\'s largest land carnivores; males can weigh over 700 kg and stand nearly 3 metres tall on their hind legs.',
        'Their fur appears white but is actually transparent and hollow, helping to trap warmth and scatter light.',
        'Polar bears are excellent swimmers and have been tracked swimming over 300 km without stopping in search of food.',
        'They rely almost entirely on sea ice to hunt ringed seals, their main prey — making them highly vulnerable to climate change.',
        'Polar bear cubs are born in snow dens in winter and weigh only about half a kilogram at birth, smaller than a guinea pig.',
      ],
    },
    {
      secret: 'Bald Eagle',
      hint: 'The national bird and symbol of the United States — a large bird of prey with a distinctive white head and brown body',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Bird of Prey' },
        { icon: '🌿', label: 'Habitat', value: 'North America' },
        { icon: '⚠️', label: 'Status', value: 'Least Concern (recovered)' },
      ],
      facts: [
        'The bald eagle is the national bird of the United States and appears on the country\'s official seal and many symbols.',
        'Despite its name, it is not bald — adults have a striking white head and tail feathers that contrast with their dark brown body.',
        'Bald eagles build the largest nests of any bird in North America; one record nest in Florida weighed nearly 3 tonnes after decades of additions.',
        'They can spot a fish from up to 3 kilometres away and dive at speeds of up to 150 km/h to snatch it from the water.',
        'By 1963 bald eagles were nearly extinct due to hunting and pesticides, but conservation efforts brought them back; they were removed from the endangered species list in 2007.',
      ],
    },
    {
      secret: 'Dolphin',
      hint: 'The intelligent, playful sea mammal that communicates with clicks and whistles and loves to ride the bow waves of boats',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Marine Mammal' },
        { icon: '🌿', label: 'Habitat', value: 'Oceans & rivers worldwide' },
        { icon: '⚠️', label: 'Status', value: 'Varies by species' },
      ],
      facts: [
        'Dolphins are highly intelligent marine mammals; they use a system of clicks, whistles and body language to communicate with each other.',
        'They are one of the few animals that can recognise themselves in a mirror — a sign of self-awareness shared with only a handful of species.',
        'Dolphins sleep with one half of their brain at a time, keeping one eye open so they can watch for dangers and come up to breathe.',
        'They hunt using echolocation — sending out sound waves and listening to the echoes to find fish even in murky water.',
        'Dolphins are known for playing, surfing in the wake of boats, and even helping humans and other animals in distress — there are many documented cases of dolphins guiding stranded whales back to sea.',
      ],
    },
    {
      secret: 'Monarch Butterfly',
      hint: 'The orange-and-black butterfly famous for its extraordinary migration journey of thousands of kilometres across North America',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Insect' },
        { icon: '🌿', label: 'Habitat', value: 'North America & Mexico' },
        { icon: '⚠️', label: 'Status', value: 'Endangered' },
      ],
      facts: [
        'Monarch butterflies are famous for their incredible annual migration: millions of them travel up to 4,500 kilometres from Canada and the United States to spend winter in Mexico.',
        'Each individual butterfly lives only a few months, so the return journey is completed by the grandchildren or great-grandchildren of the original migrants.',
        'Scientists are still not fully certain how monarchs navigate such enormous distances — they may use the position of the sun and Earth\'s magnetic field.',
        'Their orange-and-black colouring warns predators that they are poisonous — they absorb toxins from milkweed plants they eat as caterpillars.',
        'Monarch populations have declined sharply in recent decades due to loss of milkweed habitat and climate change, making conservation efforts very important.',
      ],
    },
    {
      secret: 'Koala',
      hint: 'The fluffy Australian tree-dweller that sleeps almost all day and eats only one type of leaf',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Marsupial' },
        { icon: '🌿', label: 'Habitat', value: 'Eastern Australia (eucalyptus forests)' },
        { icon: '⚠️', label: 'Status', value: 'Vulnerable' },
      ],
      facts: [
        'Koalas are marsupials, not bears — they carry their tiny babies (called joeys) in a pouch for around six months after birth.',
        'Koalas sleep up to 22 hours a day because the eucalyptus leaves they eat are so tough and low in nutrition that they need huge amounts of rest to digest them.',
        'Each koala\'s fingerprints are so similar to human fingerprints that they have confused crime scene investigators!',
        'Koalas rarely drink water — they get most of the moisture they need from the eucalyptus leaves, which is how they got their name ("koala" means "no water" in some Aboriginal languages).',
        'Devastating bushfires and habitat loss have reduced koala numbers sharply; they are now officially listed as Vulnerable to extinction in Australia.',
      ],
    },
    {
      secret: 'Kangaroo',
      hint: 'The iconic Australian marsupial that bounces on powerful back legs and carries its young in a pouch',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Marsupial' },
        { icon: '🌿', label: 'Habitat', value: 'Australia (grasslands, scrubland & forests)' },
        { icon: '⚠️', label: 'Status', value: 'Least Concern' },
      ],
      facts: [
        'Kangaroos are the largest marsupials in the world and can stand over 2 metres tall; they are found only in Australia and New Guinea.',
        'A baby kangaroo (called a joey) is the size of a jelly bean when born and crawls into its mother\'s pouch, where it continues to grow for several months.',
        'Kangaroos cannot walk backwards — their powerful hind legs and long tail mean they can only move forward, which is why a kangaroo appears on the Australian coat of arms (symbolising progress).',
        'They can jump over 9 metres in a single bound and reach speeds of up to 70 km/h, using their tail like a fifth leg for balance.',
        'There are actually more kangaroos in Australia than people — with an estimated 50 million kangaroos compared to around 26 million humans.',
      ],
    },
    {
      secret: 'Anaconda',
      hint: 'The enormous South American snake that is the heaviest in the world and kills its prey by squeezing it',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Reptile (Constrictor Snake)' },
        { icon: '🌿', label: 'Habitat', value: 'Amazon rainforests & rivers, South America' },
        { icon: '⚠️', label: 'Status', value: 'Least Concern' },
      ],
      facts: [
        'The green anaconda is the heaviest snake in the world, weighing up to 250 kg and growing to over 8 metres long — about the length of a school bus.',
        'Anacondas are constrictors, not venomous — they wrap their muscular bodies around prey and squeeze until the animal can no longer breathe.',
        'They are excellent swimmers and spend much of their time in rivers and swamps; their eyes and nostrils are on the top of their heads so they can watch for prey while mostly submerged.',
        'After a very large meal, an anaconda can go months without eating again while it slowly digests.',
        'Female anacondas are significantly larger than males — one of the most extreme size differences between sexes of any land animal.',
      ],
    },
    {
      secret: 'Zebra',
      hint: 'The African horse-like animal whose body is covered in black and white stripes that are unique to each individual',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Mammal (Equine)' },
        { icon: '🌿', label: 'Habitat', value: 'African savannah & grasslands' },
        { icon: '⚠️', label: 'Status', value: 'Varies by species' },
      ],
      facts: [
        'Every zebra has a unique stripe pattern — just like human fingerprints, no two zebras have exactly the same stripes.',
        'Scientists believe the stripes may help confuse flies and biting insects, which have trouble landing on moving striped patterns.',
        'Zebras live in large herds for protection; when threatened by predators like lions, they form a circle with the young in the middle.',
        'Foals (baby zebras) can stand and walk within minutes of birth, which is vital as predators on the African savannah are always nearby.',
        'There are three species of zebra — the plains zebra (most common), the mountain zebra and Grévy\'s zebra; the latter is endangered.',
      ],
    },
    {
      secret: 'Hippopotamus',
      hint: 'The enormous African river animal that is one of the most dangerous animals on Earth despite looking slow',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Mammal' },
        { icon: '🌿', label: 'Habitat', value: 'Sub-Saharan African rivers & lakes' },
        { icon: '⚠️', label: 'Status', value: 'Vulnerable' },
      ],
      facts: [
        'Hippopotamuses are the third-largest land animals on Earth, after elephants and white rhinos, weighing up to 4,500 kg.',
        'Despite their round, slow-looking shape, hippos can run at 30 km/h on land and are considered one of the most dangerous animals in Africa.',
        'Their skin secretes a natural pink-red oily fluid that acts as a sunscreen, moisturiser, and antibiotic all in one.',
        'Hippos spend most of the day submerged in water or mud to keep cool; they come out at night to graze on grass.',
        'They can hold their breath for up to 5 minutes underwater, and baby hippos are actually born underwater and must swim to the surface for their first breath.',
      ],
    },
    {
      secret: 'Penguin',
      hint: 'The flightless seabird that waddles on land but is a superb swimmer, found mainly in the Southern Hemisphere',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Flightless Seabird' },
        { icon: '🌿', label: 'Habitat', value: 'Southern Hemisphere (Antarctica & coasts)' },
        { icon: '⚠️', label: 'Status', value: 'Varies by species (several endangered)' },
      ],
      facts: [
        'There are 18 species of penguin and all of them live in the Southern Hemisphere — despite popular belief, penguins do not live in the Arctic with polar bears.',
        'Penguins cannot fly, but they are extraordinarily good swimmers; some species can dive to depths of over 500 metres and swim at 25 km/h.',
        'Emperor penguins — the largest species — trek up to 120 kilometres across Antarctic ice to reach their breeding grounds each year.',
        'Male Emperor penguins incubate the egg on their feet under a warm flap of skin through the brutal Antarctic winter, surviving without food for up to two months.',
        'Penguins have a special gland above their eye that filters out salt water, allowing them to drink seawater safely.',
      ],
    },
    {
      secret: 'Shark',
      hint: 'The powerful ocean predator with rows of razor-sharp teeth that has roamed the seas for hundreds of millions of years',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Cartilaginous Fish' },
        { icon: '🌿', label: 'Habitat', value: 'Oceans worldwide' },
        { icon: '⚠️', label: 'Status', value: 'Many species endangered or vulnerable' },
      ],
      facts: [
        'Sharks have existed for over 450 million years — they are older than the dinosaurs, older than trees, and have survived five mass extinctions.',
        'Instead of bones, sharks have skeletons made entirely of cartilage — the same flexible material that makes up your ears and nose.',
        'Sharks never run out of teeth; they have multiple rows and grow new teeth throughout their lives, shedding and replacing thousands over a lifetime.',
        'The great white shark can detect a single drop of blood in 100 litres of water and smell blood from up to 5 kilometres away.',
        'Despite their fearsome reputation, sharks kill an average of around 10 people per year worldwide — humans kill approximately 100 million sharks per year.',
      ],
    },
    {
      secret: 'Starfish',
      hint: 'The star-shaped sea creature with five arms that can regrow a lost limb — and is not actually a fish',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Marine Invertebrate (Echinoderm)' },
        { icon: '🌿', label: 'Habitat', value: 'Oceans worldwide (sea floors & coral reefs)' },
        { icon: '⚠️', label: 'Status', value: 'Varies by species' },
      ],
      facts: [
        'Starfish (now often called "sea stars" by scientists) are not fish at all — they have no gills, no scales, and no fins.',
        'They have an extraordinary ability to regenerate: if a starfish loses an arm, it can grow a completely new one — and in some species, the severed arm can grow a whole new body!',
        'Starfish have no brain and no blood; they use seawater pumped through a special system inside their body to move and function.',
        'They eat by pushing their stomach out of their body, surrounding their prey (like mussels or oysters), digesting it outside, then pulling their stomach back in.',
        'There are over 2,000 species of starfish, and they can be found from shallow tidal pools to depths of over 6,000 metres in the deep ocean.',
      ],
    },
    {
      secret: 'Octopus',
      hint: 'The eight-armed sea creature that is one of the most intelligent invertebrates on Earth and can change colour instantly',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Marine Invertebrate (Cephalopod)' },
        { icon: '🌿', label: 'Habitat', value: 'Oceans worldwide' },
        { icon: '⚠️', label: 'Status', value: 'Least Concern' },
      ],
      facts: [
        'An octopus has three hearts: two pump blood to its gills and one pumps it to the rest of the body — and its blood is blue because it contains copper instead of iron.',
        'Octopuses are remarkably intelligent; they can open jars, solve puzzles, use tools, and even recognise individual human faces.',
        'They can change their skin colour and texture in milliseconds to camouflage themselves perfectly against rocks, sand, or coral.',
        'If threatened, an octopus squirts a cloud of dark ink to confuse a predator, then escapes using jet propulsion by blasting water out of its body.',
        'Most octopuses live for only one to two years; the female lays up to 100,000 eggs and spends weeks guarding them without eating, often dying shortly after they hatch.',
      ],
    },
    {
      secret: 'Crab',
      hint: 'The sideways-walking crustacean with ten legs and a hard shell that lives in the sea, on beaches and even in forests',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Crustacean' },
        { icon: '🌿', label: 'Habitat', value: 'Oceans, beaches & freshwater worldwide' },
        { icon: '⚠️', label: 'Status', value: 'Varies by species' },
      ],
      facts: [
        'Crabs have ten legs — the front two are claws (called chelae) used for defence, grabbing food, and communicating with other crabs.',
        'Most crabs walk sideways because of the way their leg joints are designed, but some species, like the ghost crab, can run forward at surprising speed.',
        'Crabs moult — they shed their entire hard outer shell to grow, and during the short period before the new shell hardens they are very soft and vulnerable.',
        'Hermit crabs have soft, unprotected abdomens and protect themselves by living inside empty shells, swapping to a larger shell as they grow.',
        'The coconut crab, the world\'s largest land invertebrate, can climb trees, crack open coconuts with its powerful claws, and weigh up to 4 kg.',
      ],
    },
    {
      secret: 'Frog',
      hint: 'The jumping amphibian that begins its life as a tadpole in water and breathes partly through its skin',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Amphibian' },
        { icon: '🌿', label: 'Habitat', value: 'Freshwater habitats & damp areas worldwide' },
        { icon: '⚠️', label: 'Status', value: 'Many species threatened' },
      ],
      facts: [
        'Frogs begin life as eggs in water, hatch into tadpoles with tails and gills, then gradually transform into air-breathing, leg-sprouting frogs — a process called metamorphosis.',
        'Frogs breathe in two ways: through their lungs and directly through their moist skin, which absorbs oxygen from the air and water.',
        'There are over 7,000 species of frog — they are found on every continent except Antarctica, in habitats ranging from tropical rainforests to deserts.',
        'Some of the most beautiful frogs are also the most dangerous; poison dart frogs of South America are brightly coloured to warn predators that their skin contains deadly toxins.',
        'Frogs play a crucial role in ecosystems: they eat vast quantities of insects (including mosquitoes) and are themselves food for birds, snakes, and mammals.',
      ],
    },
    {
      secret: 'Crocodile',
      hint: 'The prehistoric reptile lurking in rivers and swamps that has the most powerful bite of any animal',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Reptile' },
        { icon: '🌿', label: 'Habitat', value: 'Tropical rivers, lakes & swamps' },
        { icon: '⚠️', label: 'Status', value: 'Varies by species (some endangered)' },
      ],
      facts: [
        'Crocodiles have been on Earth for about 200 million years — they are among the few creatures that survived the asteroid impact that wiped out the dinosaurs.',
        'They have the most powerful bite force of any living animal, yet the muscles that open their jaws are so weak a person could hold them shut with their bare hands.',
        'Crocodiles cannot chew; they swallow stones to help grind up food in their stomachs, and they shake or spin prey in the water ("death roll") to tear off pieces.',
        'Despite looking slow on land, crocodiles can sprint at about 17 km/h in short bursts and can hold their breath underwater for up to an hour.',
        'Crocodiles are surprisingly good parents — mothers guard their eggs carefully and gently carry the newly hatched babies to the water in their mouths.',
      ],
    },
    {
      secret: 'Owl',
      hint: 'The silent nocturnal bird of prey with large forward-facing eyes and the ability to rotate its head almost all the way around',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Bird of Prey (Nocturnal)' },
        { icon: '🌿', label: 'Habitat', value: 'Worldwide (forests, deserts & grasslands)' },
        { icon: '⚠️', label: 'Status', value: 'Varies by species' },
      ],
      facts: [
        'Owls can rotate their heads up to 270 degrees — nearly all the way around — because their eyes are fixed in their sockets and cannot move like human eyes.',
        'Owls fly almost completely silently because their feathers have special soft, comb-like edges that muffle the sound of air moving through them.',
        'Their hearing is extraordinarily precise — a barn owl can locate a mouse under 30 cm of snow in total darkness using sound alone.',
        'Instead of teeth, owls swallow small prey whole; they regurgitate the indigestible parts (bones, fur, feathers) in neat, compact packages called pellets.',
        'There are about 250 species of owl found on every continent except Antarctica; the smallest is the elf owl (about 12 cm tall) and the largest is the great grey owl.',
      ],
    },
    {
      secret: 'Gorilla',
      hint: 'The largest of the great apes, living in the forests of central Africa and sharing 98% of its DNA with humans',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Great Ape (Mammal)' },
        { icon: '🌿', label: 'Habitat', value: 'Central African rainforests & mountains' },
        { icon: '⚠️', label: 'Status', value: 'Endangered (mountain gorilla: Critically Endangered)' },
      ],
      facts: [
        'Gorillas share about 98.3% of their DNA with humans — making them our closest relatives alongside chimpanzees and bonobos.',
        'Despite their powerful appearance, gorillas are gentle herbivores; they spend most of their day eating fruit, leaves, and shoots, and rarely show aggression unless threatened.',
        'They live in family groups led by a dominant male called a silverback (named for the patch of silver fur on his back that appears when he matures).',
        'Gorillas are highly intelligent — they use tools, have been taught sign language to communicate with humans, and express emotions including joy, sadness, and grief.',
        'Mountain gorillas are critically endangered, with only around 1,000 remaining in the wild; conservation efforts by dedicated rangers have gradually increased their numbers.',
      ],
    },
    {
      secret: 'Peacock',
      hint: 'The magnificent bird with a dazzling fan of colourful tail feathers decorated with eye-like patterns',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Bird (Peafowl)' },
        { icon: '🌿', label: 'Habitat', value: 'South & Southeast Asian forests' },
        { icon: '⚠️', label: 'Status', value: 'Least Concern' },
      ],
      facts: [
        '"Peacock" is actually the name for the male; females are called peahens and chicks are peachicks — together they are known as peafowl.',
        'The spectacular tail (called a "train") is made of up to 200 feathers and can spread into a fan nearly 2 metres wide to attract females during courtship.',
        'The eye-like spots on the feathers are called ocelli; scientists believe their shimmering, iridescent colours are created not by pigment but by microscopic crystal-like structures that reflect light.',
        'Peacocks can fly despite their enormous tails — they roost in trees at night to stay safe from ground predators.',
        'The peacock is the national bird of India, where it is considered sacred and is protected by law.',
      ],
    },
    {
      secret: 'Camel',
      hint: 'The desert-dwelling animal famous for its hump (or humps) that can survive weeks without water in scorching heat',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Mammal (Camelid)' },
        { icon: '🌿', label: 'Habitat', value: 'Deserts of Africa & Asia' },
        { icon: '⚠️', label: 'Status', value: 'Domesticated (wild Bactrian: Critically Endangered)' },
      ],
      facts: [
        'A camel\'s humps do not store water — they store fat, which the camel can break down for energy when food is scarce; this also means the hump shrinks when the camel hasn\'t eaten.',
        'Camels can drink up to 200 litres of water in a single session after days without drinking, and their blood cells are oval-shaped (unlike humans\' round ones) to keep flowing even when dehydrated.',
        'There are two species: the dromedary (one hump), found in the Middle East and Africa, and the Bactrian (two humps), found in Central Asia.',
        'Camels have three sets of eyelids and two rows of extra-long eyelashes to keep sand out of their eyes, and they can completely close their nostrils during sandstorms.',
        'Camels have been essential to human civilisation for thousands of years — transporting people and goods across deserts where no other animal could survive.',
      ],
    },
    {
      secret: 'Turtle',
      hint: 'The ancient reptile with a shell on its back that has existed since the time of the dinosaurs and can live for over a century',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Reptile' },
        { icon: '🌿', label: 'Habitat', value: 'Oceans & freshwater worldwide' },
        { icon: '⚠️', label: 'Status', value: 'Many species endangered' },
      ],
      facts: [
        'Turtles have existed for over 220 million years, making them one of the oldest reptile groups alive today — they coexisted with dinosaurs.',
        'A turtle\'s shell is not a separate object it lives inside; it is part of its skeleton, fused to its spine and ribcage, and has nerves so the turtle can feel when it is touched.',
        'Sea turtles are remarkable navigators — they travel thousands of kilometres across oceans and always return to the exact beach where they were born to lay their eggs.',
        'The temperature of the sand in which sea turtle eggs incubate determines the sex of the hatchlings — warmer sand produces more females.',
        'Giant tortoises (land turtles) are among the world\'s longest-lived animals; one famous Aldabra tortoise named Jonathan was born around 1832 and is still alive today.',
      ],
    },
    {
      secret: 'Cobra',
      hint: 'The venomous snake famous for spreading its hood and being charmed by flute music in street performances',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Reptile (Venomous Snake)' },
        { icon: '🌿', label: 'Habitat', value: 'Africa & Asia (forests, grasslands & farmland)' },
        { icon: '⚠️', label: 'Status', value: 'Varies by species' },
      ],
      facts: [
        'Cobras are famous for their hood — a flattened, widened section of neck created by spreading their ribs — used to appear larger and more threatening when in danger.',
        'The king cobra is the world\'s longest venomous snake, growing up to 5.5 metres, and its venom is so powerful it can kill an elephant.',
        'Snake charmers\' cobras are not actually responding to the music — snakes are deaf to airborne sound; the cobra is tracking the swaying movement of the flute.',
        'Spitting cobras can accurately spray venom at a target\'s eyes from up to 2.5 metres away, causing temporary or permanent blindness.',
        'Despite their dangerous reputation, cobras play a vital role in ecosystems by controlling populations of rodents and other snakes.',
      ],
    },
    {
      secret: 'Wolf',
      hint: 'The wild ancestor of the domestic dog that lives and hunts in family packs and communicates with haunting howls',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Mammal (Canine)' },
        { icon: '🌿', label: 'Habitat', value: 'Forests, tundra & grasslands across Northern Hemisphere' },
        { icon: '⚠️', label: 'Status', value: 'Least Concern (some populations endangered)' },
      ],
      facts: [
        'All domestic dogs — from Chihuahuas to Great Danes — are descendants of grey wolves that were first domesticated by humans around 15,000 years ago.',
        'Wolves are highly social animals that live in family units called packs, usually led by a breeding pair; they cooperate to hunt prey much larger than themselves.',
        'Their howls can be heard up to 10 kilometres away; wolves howl to communicate with their pack, announce their territory, and find each other when separated.',
        'Wolves are keystone predators — their presence shapes entire ecosystems. When wolves were reintroduced to Yellowstone National Park in 1995, they changed the behaviour of deer, which allowed riverbanks to regrow and even altered the flow of rivers.',
        'A wolf\'s sense of smell is about 100 times more powerful than a human\'s, and their paw print is often the size of an adult human hand.',
      ],
    },
    {
      secret: 'Parrot',
      hint: 'The colourful tropical bird famous for mimicking human speech and living for decades — sometimes as long as its owner',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Bird' },
        { icon: '🌿', label: 'Habitat', value: 'Tropical & subtropical forests worldwide' },
        { icon: '⚠️', label: 'Status', value: 'Many species endangered' },
      ],
      facts: [
        'Parrots are among the most intelligent birds on Earth — they can mimic human speech, solve puzzles, use simple tools, and even understand the meaning of some words.',
        'Some parrot species are extraordinarily long-lived; the African grey parrot and large macaws can live for 60–80 years, sometimes outliving their human owners.',
        'There are about 350 species of parrot, ranging from the tiny pygmy parrot (10 cm) to the large hyacinth macaw (1 metre long with a wingspan of over 1.2 m).',
        'Parrots are zygodactyl — they have two toes pointing forward and two pointing backward, giving them a powerful grip and the ability to hold food and objects in their feet like hands.',
        'Many parrot species are endangered due to habitat loss and the illegal pet trade, which captures wild birds; the trade has devastated wild populations of many species.',
      ],
    },
    {
      secret: 'Pigeon',
      hint: 'The familiar city bird that is also one of the fastest and most accurate natural navigators in the animal kingdom',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Bird (Columbidae)' },
        { icon: '🌿', label: 'Habitat', value: 'Cities, towns & wild areas worldwide' },
        { icon: '⚠️', label: 'Status', value: 'Least Concern' },
      ],
      facts: [
        'Pigeons have been living alongside humans for over 5,000 years — they were probably the first bird ever domesticated, used for food, messages, and company.',
        'Homing pigeons can find their way home from over 1,800 kilometres away using a combination of the Earth\'s magnetic field, the sun\'s position, and even landmarks and smells.',
        'During World War I and II, homing pigeons saved thousands of lives by carrying vital messages through enemy fire; some were awarded military medals for bravery.',
        'Racing pigeons can fly at sustained speeds of 80 km/h and in short bursts can reach 145 km/h, making them among the fastest birds over long distances.',
        'Pigeons are one of the few animals that can recognise themselves in a mirror — a sign of self-awareness that very few animals in the world possess.',
      ],
    },
    {
      secret: 'Lizard',
      hint: 'The scaly, cold-blooded reptile that can detach its own tail to escape predators and is found on every continent except Antarctica',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Reptile' },
        { icon: '🌿', label: 'Habitat', value: 'Warm regions on every continent (except Antarctica)' },
        { icon: '⚠️', label: 'Status', value: 'Varies by species' },
      ],
      facts: [
        'Many lizards can detach their own tail when grabbed by a predator — the tail continues to wriggle, distracting the attacker while the lizard escapes, and a new tail gradually grows back.',
        'There are over 6,000 species of lizard, ranging from the tiny 16 mm dwarf gecko to the Komodo dragon, which can grow to 3 metres and weigh 70 kg.',
        'Lizards are cold-blooded (ectothermic), meaning they cannot generate their own body heat and must warm themselves in the sun before they can become active.',
        'The basilisk lizard of Central America can run across the surface of water on its two back legs for short distances — earning it the nickname "the Jesus Christ lizard."',
        'Chameleons, a type of lizard, can change colour not only for camouflage but also to communicate their mood and temperature — they are living mood rings!',
      ],
    },
    {
      secret: 'Mosquito',
      hint: 'The tiny buzzing insect that is responsible for more human deaths than any other animal on the planet',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Insect' },
        { icon: '🌿', label: 'Habitat', value: 'Worldwide (except polar regions)' },
        { icon: '⚠️', label: 'Status', value: 'Least Concern' },
      ],
      facts: [
        'Mosquitoes are the deadliest animals on Earth — not because of their bite itself, but because they spread diseases like malaria, dengue fever and Zika virus, killing over 700,000 people every year.',
        'Only female mosquitoes bite — they need the protein in blood to develop their eggs; male mosquitoes feed only on flower nectar and plant juices.',
        'Mosquitoes find their targets by detecting body heat, carbon dioxide in breath, sweat chemicals, and even the colour of clothing from up to 50 metres away.',
        'A mosquito beats its wings about 400–600 times per second, which creates the familiar high-pitched whine that alerts you to their presence.',
        'Despite being so harmful to humans, mosquitoes are also important pollinators for some plant species and are a crucial food source for bats, birds, and aquatic creatures.',
      ],
    },
    {
      secret: 'Rabbit',
      hint: 'The long-eared, fluffy mammal that lives in underground burrows and is famous for its speed and its ability to multiply rapidly',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Mammal (Lagomorph)' },
        { icon: '🌿', label: 'Habitat', value: 'Grasslands, forests & meadows worldwide' },
        { icon: '⚠️', label: 'Status', value: 'Varies by species' },
      ],
      facts: [
        'Rabbits live in underground tunnel networks called warrens, which can house large family groups and include separate chambers for sleeping and giving birth.',
        'A rabbit\'s teeth never stop growing — they are worn down continuously by chewing tough grasses and hay, so they must eat constantly to keep their teeth from overgrowing.',
        'Wild rabbits can run at up to 70 km/h and make sudden sharp turns to escape predators; they also thump their back feet hard on the ground to warn other rabbits of danger.',
        'Rabbits practise a behaviour called coprophagy — they eat a special type of their own droppings called cecotropes to extract extra nutrients that were not absorbed the first time through.',
        'Rabbits are important prey animals in many ecosystems; their populations directly affect the populations of foxes, hawks, owls, and other predators that depend on them for food.',
      ],
    },
    {
      secret: 'Hamster',
      hint: 'The small, fluffy rodent famous for its enormous stretchy cheek pouches and its love of running on a wheel at night',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Rodent (Mammal)' },
        { icon: '🌿', label: 'Habitat', value: 'Dry regions of Europe & Asia (wild)' },
        { icon: '⚠️', label: 'Status', value: 'Some species endangered' },
      ],
      facts: [
        'Hamsters have stretchy cheek pouches that extend all the way back to their shoulders — they use them to carry food back to their burrow, and can stuff in almost as much as their own body weight.',
        'Wild hamsters live in underground burrows and are mostly nocturnal; a domestic hamster on a wheel can run the equivalent of 8 kilometres in a single night.',
        'Hamsters hibernate in winter — in the wild they wake up every few days to eat from their food store, then go back to sleep until spring.',
        'They have poor eyesight and are nearly blind in bright light, but they have an excellent sense of smell and use scent glands on their flanks to mark their territory.',
        'There are about 25 species of wild hamster, but almost all pet hamsters worldwide are descended from a single family of golden hamsters found in Syria in 1930.',
      ],
    },
    {
      secret: 'Squirrel',
      hint: 'The bushy-tailed rodent that buries nuts for winter and accidentally plants millions of trees by forgetting where it hid them',
      infoFields: [
        { icon: '🐾', label: 'Animal Type', value: 'Rodent (Mammal)' },
        { icon: '🌿', label: 'Habitat', value: 'Forests & urban areas worldwide' },
        { icon: '⚠️', label: 'Status', value: 'Least Concern' },
      ],
      facts: [
        'Squirrels are responsible for planting millions of trees every year — they bury acorns and nuts to eat in winter, then forget where many of them are, allowing the seeds to sprout into trees.',
        'They can find food buried under 30 cm of snow using their keen sense of smell — but they also "pretend" to bury food when other animals are watching, to fool potential thieves.',
        'A squirrel\'s front teeth grow continuously throughout its life and are kept sharp by constant gnawing; they can chew through wood, plastic, and even electrical cables.',
        'Squirrels can fall from great heights without injury — their bushy tail acts as a parachute and they spread their body to slow descent, surviving falls that would be fatal for humans.',
        'Flying squirrels (which live in Asia, Europe and North America) don\'t actually fly; they glide using a flap of skin between their front and back legs, travelling up to 90 metres in a single glide.',
      ],
    },
  ],
  sports_games: [
    {
      secret: 'The Olympics',
      hint: 'The great international sporting competition held every four years where athletes from all over the world compete for gold, silver and bronze medals',
      infoFields: [
        { icon: '🌍', label: 'Origin', value: 'Ancient Greece' },
        { icon: '📅', label: 'First held', value: '776 BC (ancient) · 1896 (modern)' },
        { icon: '🏅', label: 'Type', value: 'Multi-Sport Event' },
      ],
      facts: [
        'The modern Olympic Games began in Athens, Greece, in 1896, inspired by the ancient Greek Olympics that took place over 1,000 years ago.',
        'Athletes from nearly every country on Earth participate — the Tokyo 2020 Olympics (held in 2021) featured 206 national delegations.',
        'The Olympic rings — five interlocking circles in blue, yellow, black, green and red — represent the five inhabited continents of the world.',
        'The Olympic flame is lit in Olympia, Greece, and carried by relay runners to the host city before every Games.',
        'Both Summer and Winter Games are held every four years, but staggered two years apart so there is an Olympic event every two years.',
      ],
    },
    {
      secret: 'Chess',
      hint: 'The ancient strategy board game played on a 64-square board where two players try to trap each other\'s king',
      infoFields: [
        { icon: '🌍', label: 'Origin', value: 'India (c. 6th century AD)' },
        { icon: '📅', label: 'First played', value: 'c. 600 AD' },
        { icon: '🏅', label: 'Type', value: 'Strategy Board Game' },
      ],
      facts: [
        'Chess is one of the oldest games still played today; it is believed to have originated in India around 1,500 years ago before spreading to Persia, Arabia and Europe.',
        'Each player starts with 16 pieces — one king, one queen, two rooks, two knights, two bishops and eight pawns — with different rules for how each piece moves.',
        'The word "checkmate" comes from the Persian phrase "shah mat," meaning "the king is helpless."',
        'There are more possible chess games than there are atoms in the observable universe — making it one of the most complex games ever invented.',
        'Many countries teach chess in schools because it develops concentration, problem-solving skills and strategic thinking.',
      ],
    },
    {
      secret: 'Wimbledon',
      hint: 'The world\'s oldest and most famous tennis tournament, held every summer on grass courts in London',
      infoFields: [
        { icon: '🌍', label: 'Origin', value: 'London, England' },
        { icon: '📅', label: 'First held', value: '1877' },
        { icon: '🏅', label: 'Type', value: 'Lawn Tennis Tournament' },
      ],
      facts: [
        'Wimbledon is the oldest tennis tournament in the world, first held in London in 1877 — making it the most prestigious event in the sport.',
        'It is the only Grand Slam tournament still played on grass courts, which makes the ball bounce faster and lower than on other surfaces.',
        'Players must wear almost entirely white clothing at Wimbledon — a tradition that has been enforced for over a century.',
        'Strawberries and cream are a famous Wimbledon tradition; about 28,000 kg of strawberries are eaten at the tournament every year.',
        'The tournament is held at the All England Club in Wimbledon, London, and the women\'s and men\'s singles champions each receive a trophy and prize money worth millions of pounds.',
      ],
    },
    {
      secret: 'FIFA World Cup',
      hint: 'The biggest football tournament in the world, held every four years and watched by billions of people',
      infoFields: [
        { icon: '🌍', label: 'Origin', value: 'Worldwide' },
        { icon: '📅', label: 'First held', value: '1930 (Uruguay)' },
        { icon: '🏅', label: 'Type', value: 'International Football Tournament' },
      ],
      facts: [
        'The FIFA World Cup is the world\'s most watched sporting event; the 2022 final between Argentina and France was seen by over 1.5 billion people.',
        'The first World Cup was held in Uruguay in 1930; Brazil have won it a record five times.',
        'The tournament is held every four years and involves teams from all over the world qualifying through regional competitions.',
        'The golden trophy that teams compete for weighs 6.1 kg and is made of 18-carat gold — but the winning team only receives a replica to keep.',
        'The 2022 World Cup in Qatar was the first to be held in the Middle East and the last to feature 32 teams; from 2026 onwards, 48 teams will compete.',
      ],
    },
    {
      secret: 'Cricket',
      hint: 'The bat-and-ball sport played over days that is hugely popular in England, India, Australia and the Caribbean',
      infoFields: [
        { icon: '🌍', label: 'Origin', value: 'England' },
        { icon: '📅', label: 'First recorded', value: '16th century' },
        { icon: '🏅', label: 'Type', value: 'Bat-and-Ball Sport' },
      ],
      facts: [
        'Cricket is one of the world\'s most popular sports, with around 2.5 billion fans mostly in South Asia, the UK, Australia and the Caribbean.',
        'A Test match — the longest form of the game — can last up to five days, which is unique among major sports.',
        'The sport originated in England and the first recorded match took place in the late 16th century; the rules were formalised in 1744.',
        'A cricket ball is hard and red (or white for shorter formats) and the bat is flat on one side and curved on the other.',
        'India vs Pakistan matches are considered among the most watched sporting events in the world, with hundreds of millions of viewers tuning in.',
      ],
    },
    {
      secret: 'Basketball',
      hint: 'The fast-paced sport invented in America where players score by throwing a ball through an elevated hoop',
      infoFields: [
        { icon: '🌍', label: 'Origin', value: 'USA' },
        { icon: '📅', label: 'Invented', value: '1891' },
        { icon: '🏅', label: 'Type', value: 'Team Ball Sport' },
      ],
      facts: [
        'Basketball was invented in 1891 by Canadian-American physical education teacher James Naismith, who wanted an indoor sport for his students to play in winter.',
        'The first "baskets" were actual peach baskets nailed to a wall; someone had to climb up and retrieve the ball by hand after every goal.',
        'The NBA — the National Basketball Association — is the world\'s top professional basketball league, headquartered in the United States.',
        'Players like Michael Jordan, LeBron James and Kobe Bryant became global celebrities and helped make basketball one of the most popular sports in the world.',
        'A regulation basketball court is 28 metres long and the hoop is exactly 3.05 metres above the ground.',
      ],
    },
    {
      secret: 'Swimming',
      hint: 'The Olympic sport where athletes race through the water using different strokes including freestyle, butterfly, breaststroke and backstroke',
      infoFields: [
        { icon: '🌍', label: 'Origin', value: 'Worldwide' },
        { icon: '📅', label: 'Olympic debut', value: '1896' },
        { icon: '🏅', label: 'Type', value: 'Aquatic Sport' },
      ],
      facts: [
        'Swimming has been an Olympic sport since the first modern Games in 1896 and is one of the most popular and widely practised sports in the world.',
        'There are four main competitive strokes: freestyle (front crawl), backstroke, breaststroke and butterfly — each requiring different techniques.',
        'Michael Phelps, the American swimmer, is the most decorated Olympian in history with 23 gold medals and 28 medals in total.',
        'Competitive swimmers shave their bodies and wear specially designed tight suits to reduce drag in the water and swim faster.',
        'Swimming is also one of the best exercises for the whole body because it works nearly every muscle group without putting stress on the joints.',
      ],
    },
    {
      secret: 'The Marathon',
      hint: 'The long-distance running race of exactly 42.195 kilometres that is named after an ancient Greek battle',
      infoFields: [
        { icon: '🌍', label: 'Origin', value: 'Ancient Greece' },
        { icon: '📅', label: 'Olympic debut', value: '1896' },
        { icon: '🏅', label: 'Type', value: 'Long-Distance Running' },
      ],
      facts: [
        'The marathon distance of 42.195 kilometres is named after the ancient Greek city of Marathon, where a famous battle was fought in 490 BC.',
        'Legend says a Greek soldier named Pheidippides ran all the way from Marathon to Athens to announce the Greek victory, then dropped dead from exhaustion.',
        'The first modern Olympic marathon was run in 1896, and the distance was standardised at 42.195 km at the 1908 London Olympics.',
        'Running a marathon is considered a major personal challenge; millions of people complete one every year around the world.',
        'The current world record for the marathon is under two hours and one minute for men, set by Eliud Kipchoge of Kenya in 2022.',
      ],
    },
  ],
  science_inventions: [
    {
      secret: 'The Telephone',
      hint: 'The invention that allowed people to speak to each other across long distances for the first time',
      infoFields: [
        { icon: '👤', label: 'Inventor', value: 'Alexander Graham Bell' },
        { icon: '📅', label: 'Invented', value: '1876' },
        { icon: '🔬', label: 'Field', value: 'Communications' },
      ],
      facts: [
        'The telephone was patented by Alexander Graham Bell in 1876; the first words ever spoken on one were reportedly "Mr Watson, come here, I want to see you."',
        'Before the telephone, the fastest way to send a message over long distances was the telegraph, which used electrical signals to send coded text.',
        'Within 10 years of its invention, over 150,000 telephones were in use in the United States alone.',
        'The telephone transformed business, politics and everyday life by making instant voice communication possible across any distance.',
        'Today\'s smartphones are direct descendants of Bell\'s invention — though they can now send video, browse the internet and run millions of apps.',
      ],
    },
    {
      secret: 'The Internet',
      hint: 'The global network of computers that allows billions of people to share information, communicate and access knowledge instantly',
      infoFields: [
        { icon: '👤', label: 'Key pioneers', value: 'Vint Cerf, Bob Kahn, Tim Berners-Lee' },
        { icon: '📅', label: 'Developed', value: '1960s–1989' },
        { icon: '🔬', label: 'Field', value: 'Communications & Technology' },
      ],
      facts: [
        'The Internet began as a US military research project called ARPANET in the late 1960s, designed to keep communication working even if part of the network was destroyed.',
        'The World Wide Web — the system of websites and links most people think of as "the internet" — was invented by British scientist Tim Berners-Lee in 1989.',
        'As of 2024, over 5 billion people — roughly two-thirds of the world\'s population — use the internet.',
        'About 4 million new blog posts, 500 million tweets and 300 billion emails are sent every single day.',
        'The internet has transformed almost every aspect of human life: shopping, entertainment, education, science, politics and how people keep in touch.',
      ],
    },
    {
      secret: 'The Aeroplane',
      hint: 'The powered flying machine invented by the Wright Brothers in 1903 that changed how people travel around the world',
      infoFields: [
        { icon: '👤', label: 'Inventors', value: 'Orville & Wilbur Wright' },
        { icon: '📅', label: 'First flight', value: '1903' },
        { icon: '🔬', label: 'Field', value: 'Transport' },
      ],
      facts: [
        'On 17 December 1903, Orville and Wilbur Wright made the first successful powered aeroplane flight at Kitty Hawk, North Carolina.',
        'The first flight lasted just 12 seconds and covered 36 metres — barely the length of a large room.',
        'Within 66 years of that first flight, humans had reached the Moon — showing how fast aviation technology advanced.',
        'Today, over 100,000 flights take off every day around the world, and about 4.5 billion passengers fly every year.',
        'Modern jet engines — which power most commercial aircraft — were developed during World War II and have made the world much smaller by connecting distant places in hours.',
      ],
    },
    {
      secret: 'The Printing Press',
      hint: 'The machine invented in the 1440s that allowed books and ideas to be copied quickly and cheaply for the first time',
      infoFields: [
        { icon: '👤', label: 'Inventor', value: 'Johannes Gutenberg' },
        { icon: '📅', label: 'Invented', value: 'c. 1440' },
        { icon: '🔬', label: 'Field', value: 'Communications & Publishing' },
      ],
      facts: [
        'The movable-type printing press was invented by Johannes Gutenberg in Germany around 1440 and revolutionised how information was shared.',
        'Before it, books were copied by hand — a slow and expensive process that meant only the very wealthy could own them.',
        'The first major book printed on Gutenberg\'s press was the Bible; it could produce 3,600 pages per day, compared to just a few pages by hand.',
        'The printing press helped spread the ideas of the Renaissance and the Scientific Revolution across Europe at extraordinary speed.',
        'Historians consider it one of the most important inventions in human history — it made literacy, education and the free exchange of ideas possible on a large scale.',
      ],
    },
    {
      secret: 'Vaccines',
      hint: 'The medical invention that teaches your immune system to fight a disease before you ever catch it, and has saved hundreds of millions of lives',
      infoFields: [
        { icon: '👤', label: 'Pioneer', value: 'Edward Jenner' },
        { icon: '📅', label: 'First vaccine', value: '1796' },
        { icon: '🔬', label: 'Field', value: 'Medicine' },
      ],
      facts: [
        'The first vaccine was created by English doctor Edward Jenner in 1796, when he discovered that giving people a mild disease called cowpox protected them from the deadly smallpox.',
        'Vaccines work by introducing a harmless version of a virus or bacteria into the body, which teaches the immune system how to fight the real disease.',
        'Smallpox, which once killed millions of people every year, was completely eradicated by 1980 thanks to a global vaccination campaign.',
        'Vaccines have saved an estimated 150 million lives over the past 50 years, making them one of the most successful public health tools ever developed.',
        'Today there are vaccines for diseases including measles, polio, flu, hepatitis and COVID-19 — many of which were once major causes of death and disability.',
      ],
    },
    {
      secret: 'The Telescope',
      hint: 'The optical instrument that allows humans to see objects far away in space, from distant planets to galaxies billions of light-years off',
      infoFields: [
        { icon: '👤', label: 'Inventor', value: 'Hans Lippershey' },
        { icon: '📅', label: 'Invented', value: '1608' },
        { icon: '🔬', label: 'Field', value: 'Astronomy' },
      ],
      facts: [
        'The telescope was invented around 1608 in the Netherlands, and Galileo Galilei was one of the first to use it to study the night sky in 1609.',
        'Galileo\'s observations with his telescope showed that the Moon had mountains, Jupiter had moons, and the Milky Way was made of countless stars.',
        'The Hubble Space Telescope, launched in 1990, orbits Earth above the atmosphere and has taken some of the most detailed images of the universe ever seen.',
        'Modern telescopes can detect light from galaxies over 13 billion light-years away — almost as old as the universe itself.',
        'The James Webb Space Telescope, launched in 2021, is so powerful it can see through dust clouds in space and study the atmospheres of distant planets.',
      ],
    },
    {
      secret: 'The Bicycle',
      hint: 'The two-wheeled, human-powered vehicle that became the world\'s most common form of transport',
      infoFields: [
        { icon: '👤', label: 'Inventor', value: 'Karl Drais' },
        { icon: '📅', label: 'Invented', value: '1817' },
        { icon: '🔬', label: 'Field', value: 'Transport' },
      ],
      facts: [
        'The first recognisable bicycle — called the "dandy horse" — was invented by German Karl von Drais in 1817; it had no pedals and riders pushed with their feet.',
        'Pedals were added in the 1860s, and the modern chain-driven bicycle design appeared in the 1880s, quickly becoming popular worldwide.',
        'There are over 1 billion bicycles in the world — more than any other type of vehicle — and they outnumber cars by about 2 to 1.',
        'The bicycle played an important role in women\'s liberation; it gave women in the 1890s a new freedom of movement and independence.',
        'Bicycles are one of the most energy-efficient forms of transport ever invented — a person on a bicycle uses less energy per kilometre than any other form of transport.',
      ],
    },
    {
      secret: 'The Light Bulb',
      hint: 'The electrical invention that allowed homes and cities to be lit up at night, ending the need for candles and gas lamps',
      infoFields: [
        { icon: '👤', label: 'Inventor', value: 'Thomas Edison (practical version)' },
        { icon: '📅', label: 'Invented', value: '1879' },
        { icon: '🔬', label: 'Field', value: 'Energy & Lighting' },
      ],
      facts: [
        'Thomas Edison is most often credited with inventing the practical electric light bulb in 1879, though several other inventors made important contributions around the same time.',
        'Edison\'s bulb used a thin carbon filament in a glass vacuum — electricity passing through the filament caused it to glow brightly without burning up quickly.',
        'Before electric lighting, most homes and streets were lit by candles, oil lamps or gas lamps, which were dim, smelly and a constant fire hazard.',
        'The light bulb made factories safer by allowing workers to work at night with better visibility, and transformed nightlife, entertainment and society.',
        'Modern LED bulbs use about 90% less energy than the original incandescent bulbs and last up to 25 times longer, making them much better for the environment.',
      ],
    },
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

// Keeps Railway server warm — pings every 4 minutes so it never sleeps
const pingServer = () => fetch(`${SERVER_URL}/api/ping`).catch(() => {});

// Silent retry with 5-minute deadline. Returns YES/NO/PARTLY on success,
// or 'TIMEOUT' if the device has no connection after 5 minutes of trying.
const askWithRetry = async (payload, maxWaitMs = 5 * 60 * 1000) => {
  const deadline = Date.now() + maxWaitMs;
  let delay = 2000;
  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${SERVER_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (data.answer && ['YES', 'NO', 'PARTLY'].includes(data.answer)) return data.answer;
    } catch {
      // swallow and retry
    }
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 8000);
  }
  return 'TIMEOUT';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const a = AVATARS[selected % AVATARS.length];

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
        Choose Your Avatar
      </Text>

      {/* Compact button showing current avatar */}
      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: C.border2, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 }}
      >
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: a.bg, borderWidth: 2.5, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: 14, color: C.text }}>Your Avatar</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: C.muted, marginTop: 2 }}>Tap to browse all avatars</Text>
        </View>
        <Text style={{ color: C.dim, fontSize: 20 }}>›</Text>
      </TouchableOpacity>

      {/* Modal grid picker */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={S.overlay}>
          <View style={[S.modal, { maxHeight: '82%' }]}>
            <View style={S.modalHandle} />
            <Text style={[S.modalTitle, { marginBottom: 4 }]}>Pick Your Avatar</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 20 }}>Tap any avatar to select it</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingBottom: 20 }}>
                {AVATARS.map((av, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => { onSelect(i); setPickerOpen(false); }}
                    style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: av.bg, borderWidth: selected === i ? 3 : 1.5, borderColor: selected === i ? C.gold : C.border2, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 30 }}>{av.emoji}</Text>
                    {selected === i && (
                      <View style={{ position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 9, color: '#1a0f00', fontFamily: F.sansBold }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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

// ─── Generic Calendar Icon ──────────────────────────────────────────────────
// A clean vector calendar (no specific date) so it reads the same on every
// platform — the 📅 emoji renders a fixed "Jul 17" on Apple devices, which we
// don't want. Pure SVG: gold binder rings, header band, and a small grid.
function CalendarGlyph({ size = 30 }) {
  const w = size;
  const h = size * 1.04;
  return (
    <Svg width={w} height={h} viewBox="0 0 32 33">
      {/* Binder rings */}
      <Rect x="8" y="0" width="2.6" height="6" rx="1.3" fill="#d4a84a" />
      <Rect x="21.4" y="0" width="2.6" height="6" rx="1.3" fill="#d4a84a" />
      {/* Body */}
      <Rect x="2" y="3.5" width="28" height="27" rx="4.5" fill="rgba(255,244,220,0.95)" stroke="#d4a84a" strokeWidth="1.4" />
      {/* Header band */}
      <Path d="M2 8 a4.5 4.5 0 0 1 4.5 -4.5 h19 a4.5 4.5 0 0 1 4.5 4.5 v3 h-28 z" fill="#d4a84a" />
      {/* Date grid dots */}
      <G fill="#b88a2e">
        <Rect x="7"  y="15.5" width="3.4" height="3.4" rx="1" />
        <Rect x="14.3" y="15.5" width="3.4" height="3.4" rx="1" />
        <Rect x="21.6" y="15.5" width="3.4" height="3.4" rx="1" />
        <Rect x="7"  y="22" width="3.4" height="3.4" rx="1" />
        <Rect x="14.3" y="22" width="3.4" height="3.4" rx="1" fill="#7c3aed" />
        <Rect x="21.6" y="22" width="3.4" height="3.4" rx="1" />
      </G>
    </Svg>
  );
}

// ─── AI Game Mascot ───────────────────────────────────────────────────────────
// Friendly, intelligent, slightly mysterious AI orb-host. Pure vector (SVG) so
// it stays crisp at any size and animates a soft glowing "thinking" pulse.
const AEllipse = Animated.createAnimatedComponent(Ellipse);
const ACircle = Animated.createAnimatedComponent(Circle);

function MascotIcon({ size = 72, uid = 'm', pulse = true }) {
  const blink = useRef(new Animated.Value(1)).current;   // eye-glow pulse
  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.55, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Polished 3D body shading — light from upper-left */}
          <RadialGradient id={`${uid}-body`} cx="38%" cy="32%" r="78%">
            <Stop offset="0%" stopColor="#b7a0ff" />
            <Stop offset="42%" stopColor="#7c4ddb" />
            <Stop offset="78%" stopColor="#4a1f9e" />
            <Stop offset="100%" stopColor="#2a0f5e" />
          </RadialGradient>
          {/* Outer ambient glow */}
          <RadialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#a78bfa" stopOpacity="0.55" />
            <Stop offset="60%" stopColor="#7c3aed" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </RadialGradient>
          {/* Dark face visor */}
          <SvgLinearGradient id={`${uid}-visor`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1a0b3e" />
            <Stop offset="100%" stopColor="#0a0420" />
          </SvgLinearGradient>
          {/* Glowing cyan eyes */}
          <RadialGradient id={`${uid}-eye`} cx="50%" cy="42%" r="65%">
            <Stop offset="0%" stopColor="#eafffe" />
            <Stop offset="35%" stopColor="#7df0ff" />
            <Stop offset="75%" stopColor="#2bb9e6" />
            <Stop offset="100%" stopColor="#0e7fb8" />
          </RadialGradient>
          {/* Antenna tip glow */}
          <RadialGradient id={`${uid}-tip`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#eafffe" />
            <Stop offset="55%" stopColor="#7df0ff" />
            <Stop offset="100%" stopColor="#2bb9e6" />
          </RadialGradient>
        </Defs>

        {/* Soft outer glow */}
        <Circle cx="50" cy="53" r="48" fill={`url(#${uid}-glow)`} />

        {/* Antenna */}
        <Line x1="50" y1="20" x2="50" y2="9" stroke="#8b6bdf" strokeWidth="2.4" strokeLinecap="round" />
        <ACircle cx="50" cy="8" r="4.6" fill={`url(#${uid}-tip)`} opacity={pulse ? blink : 1} />

        {/* Head body */}
        <Circle cx="50" cy="53" r="34" fill={`url(#${uid}-body)`} stroke="#c9b6ff" strokeWidth="1" strokeOpacity="0.35" />

        {/* Top specular highlight */}
        <Ellipse cx="41" cy="33" rx="17" ry="9" fill="#ffffff" opacity="0.20" />

        {/* Side "ear" pods */}
        <Circle cx="17.5" cy="53" r="4.6" fill="#5a2eaf" stroke="#b7a0ff" strokeWidth="0.8" strokeOpacity="0.4" />
        <Circle cx="82.5" cy="53" r="4.6" fill="#5a2eaf" stroke="#b7a0ff" strokeWidth="0.8" strokeOpacity="0.4" />

        {/* Face visor panel */}
        <Rect x="27" y="40" width="46" height="30" rx="15" ry="15" fill={`url(#${uid}-visor)`} stroke="#3a1f7a" strokeWidth="1" />
        {/* Visor sheen */}
        <Ellipse cx="42" cy="46" rx="14" ry="5" fill="#ffffff" opacity="0.06" />

        {/* Eyes — glowing, expressive */}
        <G>
          <AEllipse cx="41" cy="53" rx="5.4" ry="7" fill={`url(#${uid}-eye)`} opacity={pulse ? blink : 1} />
          <AEllipse cx="59" cy="53" rx="5.4" ry="7" fill={`url(#${uid}-eye)`} opacity={pulse ? blink : 1} />
          {/* catch-lights */}
          <Circle cx="39.3" cy="50.2" r="1.7" fill="#ffffff" opacity="0.95" />
          <Circle cx="57.3" cy="50.2" r="1.7" fill="#ffffff" opacity="0.95" />
        </G>

        {/* Friendly subtle smile */}
        <Path d="M43 63 Q50 67.5 57 63" stroke="#7df0ff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
      </Svg>
    </View>
  );
}

// ─── Premium Background ───────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Deterministic particle layout (no Math.random so it's consistent across renders)
const PARTICLE_DATA = [
  { x: 0.08, y: 0.72, size: 2, rise: 220, duration: 9000, delay: 0,    maxOp: 0.25, color: 'rgba(167,139,250,1)' },
  { x: 0.22, y: 0.45, size: 1, rise: 180, duration: 11000, delay: 2200, maxOp: 0.18, color: 'rgba(96,165,250,1)' },
  { x: 0.38, y: 0.83, size: 2, rise: 260, duration: 8500,  delay: 1000, maxOp: 0.22, color: 'rgba(216,180,254,1)' },
  { x: 0.55, y: 0.60, size: 1, rise: 200, duration: 13000, delay: 3500, maxOp: 0.15, color: 'rgba(167,139,250,1)' },
  { x: 0.70, y: 0.30, size: 3, rise: 300, duration: 10000, delay: 500,  maxOp: 0.20, color: 'rgba(96,165,250,1)' },
  { x: 0.82, y: 0.75, size: 1, rise: 150, duration: 12000, delay: 4000, maxOp: 0.18, color: 'rgba(216,180,254,1)' },
  { x: 0.14, y: 0.20, size: 2, rise: 240, duration: 9500,  delay: 6000, maxOp: 0.20, color: 'rgba(167,139,250,1)' },
  { x: 0.64, y: 0.55, size: 1, rise: 190, duration: 14000, delay: 2800, maxOp: 0.15, color: 'rgba(96,165,250,1)' },
  { x: 0.45, y: 0.10, size: 2, rise: 170, duration: 11500, delay: 7500, maxOp: 0.22, color: 'rgba(216,180,254,1)' },
  { x: 0.90, y: 0.40, size: 1, rise: 210, duration: 10500, delay: 1800, maxOp: 0.16, color: 'rgba(167,139,250,1)' },
].map(p => ({ ...p, anim: new Animated.Value(0) }));

function startParticleLoop(p) {
  p.anim.setValue(0);
  Animated.sequence([
    Animated.delay(p.delay),
    Animated.timing(p.anim, { toValue: 1, duration: p.duration, easing: Easing.linear, useNativeDriver: true }),
  ]).start(() => startParticleLoop({ ...p, delay: 800 + (p.delay % 2000) }));
}
PARTICLE_DATA.forEach(startParticleLoop);

function PremiumBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Deep midnight navy base gradient */}
      <LinearGradient
        colors={['#04040e', '#070718', '#0b0b22', '#090920', '#05050f']}
        locations={[0, 0.2, 0.5, 0.78, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient violet glow — upper third */}
      <View style={{
        position: 'absolute', top: SCREEN_H * 0.06, left: SCREEN_W * 0.5 - 160,
        width: 320, height: 320, borderRadius: 160,
        backgroundColor: 'rgba(55,20,110,0.16)',
      }} />
      <View style={{
        position: 'absolute', top: SCREEN_H * 0.10, left: SCREEN_W * 0.5 - 100,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(75,30,140,0.10)',
      }} />

      {/* Secondary deep-blue glow — lower area */}
      <View style={{
        position: 'absolute', bottom: SCREEN_H * 0.08, left: SCREEN_W * 0.5 - 130,
        width: 260, height: 220, borderRadius: 130,
        backgroundColor: 'rgba(15,35,90,0.18)',
      }} />

      {/* Vignette — top edge */}
      <LinearGradient
        colors={['rgba(3,3,12,0.85)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140 }}
      />
      {/* Vignette — bottom edge */}
      <LinearGradient
        colors={['transparent', 'rgba(3,3,12,0.85)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 }}
      />
      {/* Vignette — left edge */}
      <LinearGradient
        colors={['rgba(3,3,12,0.55)', 'transparent']}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 70 }}
      />
      {/* Vignette — right edge */}
      <LinearGradient
        colors={['transparent', 'rgba(3,3,12,0.55)']}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 70 }}
      />

      {/* Floating particles */}
      {PARTICLE_DATA.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x * SCREEN_W,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.color,
            opacity: p.anim.interpolate({ inputRange: [0, 0.1, 0.5, 0.9, 1], outputRange: [0, p.maxOp, p.maxOp, p.maxOp * 0.4, 0] }),
            transform: [{
              translateY: p.anim.interpolate({
                inputRange: [0, 1],
                outputRange: [p.y * SCREEN_H, p.y * SCREEN_H - p.rise],
              }),
            }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Glass Input ──────────────────────────────────────────────────────────────
// Premium glassmorphism text field: layered gradient body inside an accent
// border ring that lights up on focus, soft shadow that lifts on focus, and a
// faint top sheen for the "glass" read. Drop-in for <TextInput> — forwards all
// props; put layout (flex, width) on `containerStyle`, text styling on `style`.
function GlassInput({ accent = C.gold, containerStyle, style, onFocus, onBlur, editable = true, ...props }) {
  const [focused, setFocused] = useState(false);
  const lit = focused && editable;

  // Accent → rgba helpers for the focus ring (gold #d4a84a / violet #7c3aed)
  const ringFocused = accent === C.violet
    ? ['rgba(167,139,250,0.85)', 'rgba(124,58,237,0.35)', 'rgba(70,30,140,0.55)']
    : ['rgba(255,224,140,0.85)', 'rgba(212,168,74,0.35)', 'rgba(150,100,20,0.55)'];
  const ringIdle = ['rgba(120,120,180,0.32)', 'rgba(60,60,110,0.20)', 'rgba(40,40,85,0.30)'];

  return (
    <View style={[{
      borderRadius: 14,
      shadowColor: lit ? accent : '#000',
      shadowOffset: { width: 0, height: lit ? 5 : 2 },
      shadowOpacity: lit ? 0.45 : 0.30,
      shadowRadius: lit ? 13 : 6,
      elevation: lit ? 9 : 3,
    }, containerStyle]}>
      {/* Accent border ring */}
      <LinearGradient
        colors={lit ? ringFocused : ringIdle}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 14, padding: lit ? 1.6 : 1.2 }}
      >
        {/* Glass body */}
        <LinearGradient
          colors={lit
            ? ['rgba(48,44,86,0.72)', 'rgba(26,24,58,0.82)', 'rgba(16,14,40,0.88)']
            : ['rgba(38,38,72,0.62)', 'rgba(22,22,52,0.76)', 'rgba(14,14,36,0.84)']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ borderRadius: 12.6, overflow: 'hidden' }}
        >
          {/* Top sheen */}
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20 }}
          />
          <TextInput
            {...props}
            editable={editable}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            style={[{
              paddingHorizontal: 16, paddingVertical: 14,
              color: C.text, fontSize: 16, fontFamily: 'Outfit_400Regular',
              backgroundColor: 'transparent',
            }, style]}
          />
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

// ─── Premium Action Button ──────────────────────────────────────────────────
// Modern telegram-style send glyph (crisp vector)
function SendGlyph({ size = 20, color = '#ffffff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 20.5l18.5-8.5L3 3.5V10l12 2-12 2v6.5z" fill={color} />
    </Svg>
  );
}

// Deep-purple glass action button. Layered gradients give a glass-like finish
// with 3D depth (bright accent ring → rich purple body → top sheen), a soft
// violet glow shadow, and tactile press feedback. `square` makes a fixed-width
// icon button that stretches to its row's height; otherwise it's a full button.
function PremiumButton({ onPress, disabled, label, icon, square = false, width, style, textStyle }) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          borderRadius: 15,
          shadowColor: '#7c3aed',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: disabled ? 0 : 0.55,
          shadowRadius: 14,
          elevation: disabled ? 0 : 9,
        },
        square ? { width: width || 54 } : null,
        disabled ? { opacity: 0.4 } : null,
        style,
      ]}
    >
      {/* Bright accent ring (3D rim) */}
      <LinearGradient
        colors={['rgba(199,170,255,0.95)', 'rgba(124,58,237,0.45)', 'rgba(48,18,108,0.85)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[{ borderRadius: 15, padding: 1.4 }, square ? { flex: 1 } : null]}
      >
        {/* Rich purple glass body */}
        <LinearGradient
          colors={['#9355f2', '#7c3aed', '#5520ac']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={[
            { borderRadius: 13.6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
            square ? { flex: 1 } : { paddingVertical: 16, paddingHorizontal: 24 },
          ]}
        >
          {/* Top glass sheen */}
          <LinearGradient
            colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.04)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '52%' }}
          />
          {/* Inner hairline highlight */}
          <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 12.6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {icon}
            {label ? (
              <Text style={[{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 15, letterSpacing: 0.4, textShadowColor: 'rgba(30,10,70,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }, textStyle]}>
                {label}
              </Text>
            ) : null}
          </View>
        </LinearGradient>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Hint Card & Button ───────────────────────────────────────────────────────
// Glowing gold lightbulb medallion shared by the revealed-hint card and the
// reveal-hint CTA.
function HintMedallion({ size = 40 }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      borderWidth: 1.2, borderColor: 'rgba(255,224,140,0.55)',
      shadowColor: C.gold, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.55, shadowRadius: 7, elevation: 5,
    }}>
      <LinearGradient
        colors={['rgba(255,226,150,0.42)', 'rgba(150,100,20,0.32)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={{ fontSize: size * 0.5 }}>💡</Text>
    </View>
  );
}

// Revealed hint — a dark-luxury gold glass card with accent rim, soft glow,
// left accent bar and refined typography.
function HintCard({ hintNum, text, total = 2 }) {
  return (
    <View style={{
      marginBottom: 10, borderRadius: 16,
      shadowColor: C.gold, shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.30, shadowRadius: 12, elevation: 7,
    }}>
      <LinearGradient
        colors={['rgba(255,224,140,0.55)', 'rgba(212,168,74,0.18)', 'rgba(150,100,20,0.42)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, padding: 1.2 }}
      >
        <LinearGradient
          colors={['rgba(48,38,14,0.94)', 'rgba(30,24,8,0.92)', 'rgba(16,12,4,0.96)']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ borderRadius: 14.8, overflow: 'hidden' }}
        >
          {/* Top sheen */}
          <LinearGradient
            colors={['rgba(255,224,140,0.16)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32 }}
          />
          {/* Left accent bar */}
          <LinearGradient
            colors={['rgba(255,224,140,0.85)', 'rgba(212,168,74,0.30)']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 }}>
            <HintMedallion size={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: 'rgba(255,215,130,0.85)', fontFamily: 'Outfit_700Bold', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 3 }}>Hint {hintNum} of {total}</Text>
              <Text style={{ fontSize: 15, color: '#fbe9c0', fontFamily: 'Outfit_600SemiBold', lineHeight: 21 }}>{text}</Text>
            </View>
          </View>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

// Reveal-hint CTA — inviting gold glass button that encourages a tap; an "AD"
// badge sets the watch-an-ad expectation, with a chevron affordance.
function HintButton({ nextHint, total = 2, onPress, free = false }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85} onPress={onPress}
      style={{
        marginTop: 10, borderRadius: 16,
        shadowColor: C.gold, shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.40, shadowRadius: 13, elevation: 8,
      }}
    >
      <LinearGradient
        colors={['rgba(255,224,140,0.75)', 'rgba(212,168,74,0.30)', 'rgba(150,100,20,0.52)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, padding: 1.4 }}
      >
        <LinearGradient
          colors={['rgba(62,48,18,0.96)', 'rgba(40,30,10,0.96)']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ borderRadius: 14.6, overflow: 'hidden' }}
        >
          {/* Top sheen */}
          <LinearGradient
            colors={['rgba(255,224,140,0.22)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '58%' }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
            <HintMedallion size={42} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: C.gold2, fontFamily: 'Outfit_700Bold', letterSpacing: 0.3 }}>Reveal Hint {nextHint} of {total}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {free ? (
                  <>
                    <View style={{ backgroundColor: 'rgba(120,220,140,0.18)', borderWidth: 1, borderColor: 'rgba(120,220,140,0.4)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1.5 }}>
                      <Text style={{ fontSize: 9, color: 'rgba(150,235,170,0.95)', fontFamily: 'Outfit_700Bold', letterSpacing: 1 }}>FREE</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: 'rgba(220,195,140,0.78)', fontFamily: 'Outfit_400Regular' }}>Tap to reveal a clue</Text>
                  </>
                ) : (
                  <>
                    <View style={{ backgroundColor: 'rgba(255,224,140,0.15)', borderWidth: 1, borderColor: 'rgba(255,224,140,0.3)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1.5 }}>
                      <Text style={{ fontSize: 9, color: 'rgba(255,215,130,0.95)', fontFamily: 'Outfit_700Bold', letterSpacing: 1 }}>▶ AD</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: 'rgba(220,195,140,0.78)', fontFamily: 'Outfit_400Regular' }}>Watch a short ad to unlock</Text>
                  </>
                )}
              </View>
            </View>
            <Text style={{ fontSize: 24, color: 'rgba(255,215,130,0.55)', fontFamily: 'Outfit_400Regular', marginTop: -2 }}>›</Text>
          </View>
        </LinearGradient>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Progress Counter ─────────────────────────────────────────────────────────
// Compact metallic-gold progress pill: the body fills with a soft gold wash as
// questions are used, a crisp metallic bar tracks the exact fraction along the
// bottom, and the colour escalates gold → amber → red as you near the limit.
function ProgressCounter({ count, limit = 20 }) {
  const pct = Math.max(0, Math.min(1, count / limit));
  const danger = pct >= 0.8;
  const warn = !danger && pct >= 0.55;
  const accent = danger ? C.danger : warn ? C.warn : C.gold;

  const rim = danger
    ? ['rgba(248,120,110,0.90)', 'rgba(180,50,45,0.50)', 'rgba(120,30,28,0.70)']
    : warn
    ? ['rgba(255,205,120,0.90)', 'rgba(190,120,30,0.50)', 'rgba(120,80,20,0.70)']
    : ['rgba(255,233,168,0.92)', 'rgba(212,168,74,0.45)', 'rgba(138,106,36,0.72)'];
  const fill = danger
    ? ['rgba(248,81,73,0.34)', 'rgba(180,40,35,0.16)']
    : warn
    ? ['rgba(240,160,48,0.32)', 'rgba(170,110,20,0.15)']
    : ['rgba(246,226,122,0.30)', 'rgba(212,168,74,0.14)'];
  const bar = danger ? ['#ff8a7e', '#c4302a'] : warn ? ['#ffd27a', '#d4a020'] : ['#f6e27a', '#d4a84a'];

  return (
    <View style={{
      borderRadius: 13,
      shadowColor: accent, shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.45, shadowRadius: 8, elevation: 6,
    }}>
      {/* Metallic rim */}
      <LinearGradient colors={rim} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 13, padding: 1.2 }}>
        <View style={{ borderRadius: 11.8, overflow: 'hidden', backgroundColor: 'rgba(18,14,5,0.96)', minWidth: 66 }}>
          {/* Progress wash (grows with count) */}
          <LinearGradient colors={fill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct * 100}%` }} />
          {/* Top sheen */}
          <LinearGradient colors={['rgba(255,255,255,0.13)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '52%' }} />
          {/* Count */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', paddingHorizontal: 12, paddingTop: 5, paddingBottom: 6 }}>
            <Text style={{ fontFamily: 'Cinzel_900Black', fontSize: 15, color: accent, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{count}</Text>
            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 11, color: 'rgba(225,200,145,0.55)' }}> / {limit}</Text>
          </View>
          {/* Crisp metallic progress bar */}
          <View style={{ height: 2.5, backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <LinearGradient colors={bar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 2.5, width: `${pct * 100}%` }} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Solve Button ─────────────────────────────────────────────────────────────
// Large, casino-grade metallic gold CTA. A darker gold plinth gives real 3D
// thickness; a bright bevel ring frames a polished multi-stop gold face; a top
// gloss plus diagonal shine streaks read as reflected light; and the engraved
// Cinzel serif label sits on a soft light shadow. Soft gold glow makes it pop.
function SolveButton({ label = '✓ I Know the Answer — Solve!', onPress }) {
  return (
    <View style={{
      borderRadius: 18,
      shadowColor: C.gold, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.60, shadowRadius: 18, elevation: 14,
    }}>
      {/* Dark-gold plinth — the button's 3D thickness */}
      <LinearGradient colors={['#7a5a1e', '#4a3510']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ borderRadius: 18, paddingBottom: 3.5 }}>
        <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ borderRadius: 17 }}>
          {/* Bright bevel ring */}
          <LinearGradient
            colors={['rgba(255,247,205,0.95)', 'rgba(212,168,74,0.40)', 'rgba(120,85,20,0.92)']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={{ borderRadius: 17, padding: 1.5 }}
          >
            {/* Polished metallic face */}
            <LinearGradient
              colors={['#ffe9a8', '#f3d678', '#d9ad4e', '#c2902f', '#eccf72']}
              locations={[0, 0.18, 0.52, 0.82, 1]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={{ borderRadius: 15.6, overflow: 'hidden', paddingVertical: 19, alignItems: 'center', justifyContent: 'center' }}
            >
              {/* Top gloss */}
              <LinearGradient
                colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.06)', 'transparent']}
                locations={[0, 0.45, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%' }}
              />
              {/* Diagonal polished-light shine streaks */}
              <View pointerEvents="none" style={{ position: 'absolute', top: -30, left: '20%', width: 54, height: 150, backgroundColor: 'rgba(255,255,255,0.28)', transform: [{ rotate: '22deg' }] }} />
              <View pointerEvents="none" style={{ position: 'absolute', top: -30, left: '34%', width: 18, height: 150, backgroundColor: 'rgba(255,255,255,0.42)', transform: [{ rotate: '22deg' }] }} />
              {/* Reflective bottom edge */}
              <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,247,215,0.5)' }} />
              {/* Engraved serif label */}
              <Text style={{
                fontFamily: 'Cinzel_700Bold', fontSize: 18, color: '#3a2606', letterSpacing: 1,
                textShadowColor: 'rgba(255,247,215,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1,
              }}>
                {label}
              </Text>
            </LinearGradient>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// ─── Q&A Card ─────────────────────────────────────────────────────────────────
// One refined card for every asked question, shared by Solo & Daily so the feed
// reads consistently. Subtle vertical gradient + hairline border + soft shadow
// give gentle depth; an accent-tinted number badge anchors the row; the answer
// resolves into an elegant colour-coded chip (or a "thinking" spinner).
const ANSWER_STYLES = {
  YES:     { color: C.success, border: 'rgba(34,197,94,0.42)',  bg: 'rgba(34,197,94,0.10)',  label: '✓  Yes' },
  NO:      { color: C.danger,  border: 'rgba(248,81,73,0.42)',  bg: 'rgba(248,81,73,0.10)',  label: '✗  No' },
  PARTLY:  { color: C.warn,    border: 'rgba(240,160,48,0.42)', bg: 'rgba(240,160,48,0.10)', label: '~  Partly' },
  TIMEOUT: { color: C.danger,  border: 'rgba(248,81,73,0.42)',  bg: 'rgba(248,81,73,0.08)',  label: 'No connection — check internet' },
};

function QACard({ num, text, answer, accent = 'violet' }) {
  const isGold = accent === 'gold';
  const badgeBg = isGold ? 'rgba(212,168,74,0.16)' : 'rgba(124,58,237,0.20)';
  const badgeRing = isGold ? 'rgba(255,224,140,0.45)' : 'rgba(167,139,250,0.45)';
  const badgeText = isGold ? C.gold2 : C.violet2;
  const a = answer && answer !== null ? ANSWER_STYLES[answer] : null;

  return (
    <View style={{
      marginBottom: 10, borderRadius: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.26, shadowRadius: 8, elevation: 4,
    }}>
      <LinearGradient
        colors={['rgba(40,40,74,0.90)', 'rgba(24,24,52,0.92)', 'rgba(15,15,38,0.95)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(120,120,185,0.14)', overflow: 'hidden' }}
      >
        {/* Top sheen */}
        <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 22 }} />
        <View style={{ padding: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
            {/* Number badge */}
            <View style={{ width: 27, height: 27, borderRadius: 9, backgroundColor: badgeBg, borderWidth: 1, borderColor: badgeRing, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Text style={{ fontSize: 11, color: badgeText, fontFamily: F.sansBold }}>{num}</Text>
            </View>
            <Text style={[S.tBody, { flex: 1, color: C.text, fontFamily: F.sansMed }]}>{text}</Text>
          </View>
          {/* Answer */}
          <View style={{ marginLeft: 38, marginTop: 9 }}>
            {answer === null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={isGold ? C.gold : C.violet2} />
                <Text style={S.tCaption}>AI is thinking…</Text>
              </View>
            ) : (
              <View style={{ alignSelf: 'flex-start', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: a.border, backgroundColor: a.bg }}>
                <Text style={{ fontSize: 13, fontFamily: F.sansBold, color: a.color }}>{a.label}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EnigmaGame() {
  const insets = useSafeAreaInsets();

  const [screen, setScreen] = useState('splash');
  const [game, setGame] = useState(null);
  const [viewerId, setViewerId] = useState(null);

  const [splashScale, setSplashScale] = useState(0.30);
  const [splashImgReady, setSplashImgReady] = useState(false);
  const sweepX = useRef(new Animated.Value(-80)).current;
  const splashHidden = useRef(false);

  // Keep Railway server warm — prevents cold-start errors
  useEffect(() => {
    pingServer();
    const interval = setInterval(pingServer, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (screen !== 'splash') return;
    // Wait for the logo bitmap to be decoded and ready to render —
    // otherwise the rAF ticks happen during decode and the screen
    // jumps straight to the final frame.
    if (!splashImgReady) return;
    // Manual rAF-driven zoom. MaskedView on iOS ignores transforms
    // on its parent, so we drive React state and pass real width/
    // height to MaskedView itself — forces a layout pass per frame.
    const ZOOM_MS = 3500;
    const startScale = 0.30;
    const endScale = 1.0;
    const t0 = Date.now();
    let raf;
    const tick = () => {
      const t = Math.min(1, (Date.now() - t0) / ZOOM_MS);
      const eased = 1 - Math.pow(1 - t, 3);   // ease-out cubic
      setSplashScale(startScale + (endScale - startScale) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Looping bright sweep bar across letters
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(sweepX, { toValue: 420, duration: 2200, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(sweepX, { toValue: -80, duration: 0, useNativeDriver: true }),
      ])
    );
    sweep.start();
    // 7000ms total: 3500ms zoom + 3500ms at full size
    const timerId = setTimeout(() => setScreen('home'), 7000);
    return () => { clearTimeout(timerId); sweep.stop(); if (raf) cancelAnimationFrame(raf); };
  }, [screen, splashImgReady]);

  // Hide the native splash only AFTER the JS splash has painted —
  // this is what eliminates the black gap.
  const onSplashLayout = () => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  };

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

  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [dailyPlayerName, setDailyPlayerName] = useState('');
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyStartTime, setDailyStartTime] = useState(null);

  // Solo mode state
  const [soloChallenge, setSoloChallenge] = useState(null);
  const [soloQuestions, setSoloQuestions] = useState([]);
  const [soloInput, setSoloInput] = useState('');
  const [soloSolveInput, setSoloSolveInput] = useState('');
  const [soloSolveOpen, setSoloSolveOpen] = useState(false);
  const [soloLoading, setSoloLoading] = useState(false);
  const [soloResult, setSoloResult] = useState(null);
  const [soloCategory, setSoloCategory] = useState('random');
  const [soloTier, setSoloTier] = useState('senior');
  const [soloHintsUsed, setSoloHintsUsed] = useState(0);
  const [dailyHintsUsed, setDailyHintsUsed] = useState(0);
  const [adModalVisible, setAdModalVisible] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [adReady, setAdReady] = useState(false);
  const [pendingHintMode, setPendingHintMode] = useState(null);

  const feedScrollRef = useRef(null);
  const gameRef = useRef(game);
  const [guesserSecsLeft, setGuesserSecsLeft] = useState(30);
  const [hostSecsLeft, setHostSecsLeft] = useState(15);
  const [timeoutToast, setTimeoutToast] = useState(null);
  const [hostWarningData, setHostWarningData] = useState(null);
  const [hostWarningSecsLeft, setHostWarningSecsLeft] = useState(10);

  // Animated values for smooth timer bars (avoid 1s jump steps)
  const guesserBarAnim = useRef(new Animated.Value(1)).current;
  const hostBarAnim = useRef(new Animated.Value(1)).current;
  const hostWarnBarAnim = useRef(new Animated.Value(1)).current;

  // Smooth bar animations — each runs a 950ms tween on every 1s tick
  // so the bar glides continuously instead of jumping in 1s steps.
  useEffect(() => {
    Animated.timing(guesserBarAnim, { toValue: guesserSecsLeft / 30, duration: 950, useNativeDriver: false }).start();
  }, [guesserSecsLeft]);
  useEffect(() => {
    Animated.timing(hostBarAnim, { toValue: hostSecsLeft / 15, duration: 950, useNativeDriver: false }).start();
  }, [hostSecsLeft]);
  useEffect(() => {
    Animated.timing(hostWarnBarAnim, { toValue: hostWarningSecsLeft / 10, duration: 950, useNativeDriver: false }).start();
  }, [hostWarningSecsLeft]);

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

  // Auto game-over check — only the host triggers this to avoid race conditions
  useEffect(() => {
    if (screen !== 'game' || !game || game.status !== 'playing') return;
    const isHost = game.players.find(p => p.id === viewerId)?.isHost;
    if (!isHost) return;
    const qUsed = game.questions.filter((q) => q.answer !== null).length;
    if (qUsed >= 20) endRound(null, game);
  }, [game?.questions]);

  // Keep gameRef in sync for use inside timer callbacks
  useEffect(() => { gameRef.current = game; }, [game]);

  // Guesser: 30-second turn timer — derives all conditions from raw state, not component-level consts
  useEffect(() => {
    if (!game || screen !== 'game') { setGuesserSecsLeft(30); return; }
    const vwr = game.players.find(p => p.id === viewerId);
    if (!vwr || vwr.isHost) { setGuesserSecsLeft(30); return; }
    const active = game.players.filter(p => !p.isHost);
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
        const active2 = g.players.filter(p => !p.isHost);
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
  const activeGuessers = game?.players.filter((p) => !p.isHost) || [];
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
      if (session.players.length >= 5) throw new Error('Room is full (max 5 players)');
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
      // Keep name & avatar so the player doesn't have to re-enter them later.
      setCodeInput('');
      setScreen('lobby');
    } catch (e) {
      Alert.alert('Could not join', e.message || 'This room is no longer available.');
      loadPublicRooms();
    }
  };

  // ─── Actions ──────────────────────────────────────────────────────────────
  const createGame = async (isPublic = isPublicRoom) => {
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
        isPublic, createdAt: new Date().toISOString(),
      };
      await supabase.from('sessions').upsert({ room_code: roomCode, data: session, is_public: isPublic });
      setGame(session);
      setViewerId(playerId);
      // Keep name & avatar so the player doesn't have to re-enter them later.
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
      if (session.players.length >= 5) throw new Error('Room is full (max 5 players)');
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
      // Keep name & avatar so the player doesn't have to re-enter them later.
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
        players: game.players.map((p) =>
          p.id === game.pendingSolve.playerId ? { ...p, score: Math.max(0, p.score - 5) } : p
        ),
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

  // ─── Solo Mode helpers ────────────────────────────────────────────────────
  const getRandomChallenge = (categoryId = 'random', tier = 'senior') => {
    const library = tier === 'junior' ? JUNIOR_LIBRARY : CONTENT_LIBRARY;
    const themes = tier === 'junior' ? JUNIOR_THEMES : THEMES;
    const themeIds = categoryId === 'random' ? Object.keys(library) : [categoryId];
    const pool = themeIds.flatMap((id) => (library[id] || []).map((item) => ({ themeId: id, item })));
    if (!pool.length) return getRandomChallenge('random', tier);
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const theme = themes.find((t) => t.id === picked.themeId) || themes[0];
    return { secret: picked.item.secret, hint: picked.item.hint, infoFields: picked.item.infoFields || [], facts: picked.item.facts, categoryLabel: theme.label, categoryIcon: theme.icon };
  };

  const computeHint = (secret, hintNum, challengeHint = null) => {
    const words = secret.trim().split(/\s+/);
    if (hintNum === 1) { const n = words.length; return `The secret is ${n} word${n !== 1 ? 's' : ''} long`; }
    if (hintNum === 2) { const firstMeaningful = words[0].toLowerCase() === 'the' && words.length > 1 ? words[1] : words[0]; return `It starts with the letter "${firstMeaningful[0].toUpperCase()}"`; }
    if (hintNum === 3 && challengeHint) return challengeHint;
    return null;
  };

  const startSoloChallenge = () => {
    setSoloChallenge(getRandomChallenge(soloCategory, soloTier));
    setSoloQuestions([]);
    setSoloInput('');
    setSoloSolveInput('');
    setSoloSolveOpen(false);
    setSoloResult(null);
    setSoloHintsUsed(0);
    setScreen('solo_game');
  };

  useEffect(() => {
    if (!adModalVisible) return;
    setAdCountdown(5);
    setAdReady(false);
    const interval = setInterval(() => {
      setAdCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); setAdReady(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [adModalVisible]);

  // Auto-load and poll public rooms every 10s while on the rooms screen.
  // Must live with the other hooks (before any screen early-return) so the
  // hook order stays stable across renders — it self-guards on `screen`.
  useEffect(() => {
    if (screen !== 'rooms') return;
    loadPublicRooms();
    const interval = setInterval(loadPublicRooms, 10000);
    return () => clearInterval(interval);
  }, [screen]);

  const openAdForHint = (mode) => {
    setPendingHintMode(mode);
    setAdModalVisible(true);
  };

  const collectHint = () => {
    setAdModalVisible(false);
    if (pendingHintMode === 'solo') {
      const nextHint = soloHintsUsed + 1;
      setSoloQuestions(prev => [...prev, { id: Date.now(), type: 'hint', hintNum: nextHint, text: computeHint(soloChallenge.secret, nextHint, soloChallenge.hint) }]);
      setSoloHintsUsed(nextHint);
    } else if (pendingHintMode === 'daily') {
      const nextHint = dailyHintsUsed + 1;
      setDailyQuestions(prev => [...prev, { id: Date.now(), type: 'hint', hintNum: nextHint, text: computeHint(dailyChallenge.secret, nextHint) }]);
      setDailyHintsUsed(nextHint);
    }
    setPendingHintMode(null);
  };

  const useSoloHint = () => {
    const maxHints = soloTier === 'junior' ? 3 : 2;
    if (soloHintsUsed >= maxHints || !soloChallenge) return;
    const nextHint = soloHintsUsed + 1;
    setSoloQuestions(prev => [...prev, { id: Date.now(), type: 'hint', hintNum: nextHint, text: computeHint(soloChallenge.secret, nextHint, soloChallenge.hint) }]);
    setSoloHintsUsed(nextHint);
  };

  const askSoloQuestion = async (question) => {
    const q = question.trim();
    const realQCount = soloQuestions.filter(qq => !qq.type).length;
    if (!q || soloLoading || realQCount >= 20 || !soloChallenge) return;
    const entry = { id: Date.now(), text: q, answer: null };
    setSoloQuestions(prev => [...prev, entry]);
    setSoloInput('');
    setSoloLoading(true);
    const answer = await askWithRetry({ secret: soloChallenge.secret, facts: soloChallenge.facts, category: soloChallenge.categoryLabel, question: q });
    setSoloQuestions(prev => prev.map(qq => qq.id === entry.id ? { ...qq, answer } : qq));
    setSoloLoading(false);
  };


  const finishSoloChallenge = (guess) => {
    if (!guess.trim() || !soloChallenge) return;
    const isCorrect = fuzzyMatch(guess.trim(), soloChallenge.secret);
    setSoloResult({ solved: isCorrect, questionsUsed: soloQuestions.filter(qq => !qq.type).length });
    setSoloSolveOpen(false);
    setScreen('solo_result');
  };

  // ─── Daily Challenge helpers ──────────────────────────────────────────────
  const startDailyChallenge = () => {
    const { theme, item, date } = getDailyChallenge();
    setDailyChallenge({
      secret: item.secret,
      hint: item.hint,
      facts: item.facts,
      categoryLabel: theme.label,
      categoryIcon: theme.icon,
      date,
    });
    setDailyQuestions([]);
    setDailyInput('');
    setDailySolveInput('');
    setDailySolveOpen(false);
    setDailyResult(null);
    setDailyHintsUsed(0);
    setDailyStartTime(Date.now());
    setScreen('daily_game');
  };

  const useDailyHint = () => {
    if (dailyHintsUsed >= 2 || !dailyChallenge) return;
    const nextHint = dailyHintsUsed + 1;
    setDailyQuestions(prev => [...prev, { id: Date.now(), type: 'hint', hintNum: nextHint, text: computeHint(dailyChallenge.secret, nextHint) }]);
    setDailyHintsUsed(nextHint);
  };

  const askDailyQuestion = async (question) => {
    const q = question.trim();
    const realQCount = dailyQuestions.filter(qq => !qq.type).length;
    if (!q || dailyLoading || realQCount >= 20) return;
    const entry = { id: Date.now(), text: q, answer: null };
    setDailyQuestions(prev => [...prev, entry]);
    setDailyInput('');
    setDailyLoading(true);
    const answer = await askWithRetry({ secret: dailyChallenge.secret, facts: dailyChallenge.facts, category: dailyChallenge.categoryLabel, question: q });
    setDailyQuestions(prev => prev.map(qq => qq.id === entry.id ? { ...qq, answer } : qq));
    setDailyLoading(false);
  };


  const finishDailyChallenge = async (guess) => {
    if (!guess.trim() || !dailyChallenge) return;
    const isCorrect = fuzzyMatch(guess.trim(), dailyChallenge.secret);
    const timeSeconds = Math.round((Date.now() - dailyStartTime) / 1000);
    const questionsUsed = dailyQuestions.filter(qq => !qq.type).length;
    setDailyResult({ solved: isCorrect, questionsUsed, timeSeconds });
    setDailySolveOpen(false);
    setScreen('daily_result');
    try {
      await fetch(`${SERVER_URL}/api/daily-result`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: nameInput.trim() || 'Anonymous', challengeDate: getDailyDateKey(), solved: isCorrect, questionsUsed, timeSeconds, secret: dailyChallenge.secret }),
      });
    } catch {}
    try {
      const res = await fetch(`${SERVER_URL}/api/daily-leaderboard/${getDailyDateKey()}`);
      setDailyLeaderboard(await res.json());
    } catch {}
  };

  const joinLink = game?.roomCode
    ? LinkingExpo.createURL('/', { queryParams: { join: game.roomCode } })
    : `enigma://join?code=${game?.roomCode}`;

  const SBar = () => game
    ? <SimBar players={game.players} viewerId={viewerId} onSwitch={setViewerId} onHome={goHome} topInset={insets.top} />
    : null;

  // ─── SPLASH ───────────────────────────────────────────────────────────────
  if (screen === 'splash') {
    const BASE_W = 440, BASE_H = 242;
    const LW = Math.round(BASE_W * splashScale);
    const LH = Math.round(BASE_H * splashScale);
    const logoSrc = require('../assets/Haque Games Metallic Logo.png');
    return (
      <View
        onLayout={onSplashLayout}
        style={{ flex: 1, backgroundColor: '#06060f', alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{
          width: LW,
          height: LH,
          shadowColor: '#000',
          shadowOpacity: 0.7,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }}>
          {/* Logo + sweep both clipped to letter shapes by a single MaskedView */}
          <MaskedView
            style={{ width: LW, height: LH, overflow: 'hidden' }}
            maskElement={
              <Image source={logoSrc} style={{ width: LW, height: LH }} resizeMode="contain" />
            }
          >
            <View style={{ width: LW, height: LH, overflow: 'hidden' }}>
              {/* The visible logo — onLoad flips splashImgReady to start zoom */}
              <Image
                source={logoSrc}
                style={{ width: LW, height: LH }}
                resizeMode="contain"
                onLoad={() => setSplashImgReady(true)}
              />
              {/* Soft halo behind core */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute', top: 0, height: LH, width: 90,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  transform: [{ translateX: Animated.subtract(sweepX, new Animated.Value(32)) }, { skewX: '-16deg' }],
                }}
              />
              {/* Bright sweep core */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute', top: 0, height: LH, width: 28,
                  backgroundColor: 'rgba(255,255,255,0.90)',
                  transform: [{ translateX: sweepX }, { skewX: '-16deg' }],
                }}
              />
            </View>
          </MaskedView>
        </View>
      </View>
    );
  }

  // ─── HOME — personal landing ──────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: '#05050f' }]}>
        <PremiumBackground />
        <Modal visible={howToPlayOpen} animationType="slide" transparent onRequestClose={() => setHowToPlayOpen(false)}>
          <View style={S.overlay}>
            <View style={[S.modal, { maxHeight: '90%' }]}>
              <View style={S.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[S.modalTitle, { marginBottom: 16 }]}>📖 How to Play</Text>

                {/* Daily Challenge */}
                <View style={{ backgroundColor: 'rgba(212,168,74,0.07)', borderWidth: 1, borderColor: 'rgba(212,168,74,0.3)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold', fontSize: 15, marginBottom: 8 }}>📅 Daily Challenge</Text>
                  <Text style={S.bodyText}>One new secret every day, the same for all players worldwide. You get <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>20 questions</Text> answered by AI to crack it.</Text>
                  <Text style={[S.bodyText, { marginTop: 6 }]}>{'⭐⭐⭐ '}<Text style={{ color: C.gold }}>Legendary</Text>{' — solved in 5 or fewer questions\n'}{'⭐⭐   '}<Text style={{ color: C.gold }}>Expert</Text>{' — solved in 10 or fewer\n'}{'⭐     '}<Text style={{ color: C.gold }}>Good</Text>{' — solved in 15 or fewer'}</Text>
                  <Text style={[S.bodyText, { marginTop: 6 }]}>Your result goes on the <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>Daily Leaderboard</Text>. After the game, an educational card reveals key facts about the secret.</Text>
                </View>

                {/* Solo Mode */}
                <View style={{ backgroundColor: 'rgba(34,197,94,0.07)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <Text style={{ color: C.success, fontFamily: 'Outfit_700Bold', fontSize: 15, marginBottom: 8 }}>🤖 Solo Mode</Text>
                  <Text style={S.bodyText}>Play alone against the AI. Choose a category or go fully random. You get <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>20 questions</Text> to identify the secret.</Text>
                  <Text style={[S.bodyText, { marginTop: 8 }]}>Pick your difficulty tier:</Text>
                  <Text style={[S.bodyText, { marginTop: 4 }]}>
                    {'🟢 '}<Text style={{ color: '#ff6b35', fontFamily: 'Outfit_700Bold' }}>Junior</Text>{' — Fun categories, easy clues and up to 3 free hints. Great for younger players and beginners.\n'}
                    {'🟣 '}<Text style={{ color: C.violet2, fontFamily: 'Outfit_700Bold' }}>Scholar</Text>{' — Deep trivia, tougher secrets and 2 ad-unlocked hints. For seasoned players.'}
                  </Text>
                  <Text style={[S.bodyText, { marginTop: 8 }]}>Ask yes/no questions, then tap <Text style={{ color: C.success, fontFamily: 'Outfit_700Bold' }}>💡 I Know the Answer</Text> when you're ready to guess. Play as many rounds as you like — a new secret is picked every time.</Text>
                  <Text style={[S.bodyText, { marginTop: 6 }]}>After each round, the <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>About This Secret</Text> card teaches you fascinating facts about what you were guessing.</Text>
                </View>

                {/* Multiplayer */}
                <View style={{ backgroundColor: 'rgba(124,58,237,0.07)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <Text style={{ color: C.violet2, fontFamily: 'Outfit_700Bold', fontSize: 15, marginBottom: 8 }}>👥 Multiplayer</Text>
                  <Text style={S.bodyText}>Create or join a room with friends. One player is the <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>Host</Text> who picks a secret; everyone else is a <Text style={{ color: C.violet2, fontFamily: 'Outfit_700Bold' }}>Guesser</Text>.</Text>
                  <Text style={[S.bodyText, { marginTop: 8 }]}>Choose your room type when creating a game:</Text>
                  <Text style={[S.bodyText, { marginTop: 4 }]}>
                    {'🔒 '}<Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>Private Room</Text>{' — Share the room code with friends. Only players with the code can join.\n'}
                    {'🌐 '}<Text style={{ color: C.violet2, fontFamily: 'Outfit_700Bold' }}>Public Room</Text>{' — Open to anyone. Great for meeting new players!'}
                  </Text>
                  <Text style={[S.bodyText, { marginTop: 8 }]}>The Host answers every question with <Text style={{ color: C.success, fontFamily: 'Outfit_700Bold' }}>Yes</Text>, <Text style={{ color: C.danger, fontFamily: 'Outfit_700Bold' }}>No</Text>, or <Text style={{ color: C.warn, fontFamily: 'Outfit_700Bold' }}>Partly</Text>. There are <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>20 questions</Text> shared among all guessers.</Text>
                  <Text style={[S.bodyText, { marginTop: 6 }]}>
                    {'• '}<Text style={{ color: C.success }}>Correct guess</Text>{' → Guesser wins, earns '}<Text style={{ color: C.gold }}>10 pts\n</Text>
                    {'• '}<Text style={{ color: C.danger }}>Wrong guess</Text>{' → −5 pts, but you stay in the game\n'}
                    {'• All questions used → '}<Text style={{ color: C.gold }}>Host wins, earns 5 pts</Text>
                  </Text>
                  <Text style={[S.bodyText, { marginTop: 6 }]}>After each round the Host role rotates automatically. Play as many rounds as you like!</Text>
                </View>
                <TouchableOpacity style={[S.btnGold, { marginTop: 24, marginBottom: 8 }]} onPress={() => setHowToPlayOpen(false)}>
                  <Text style={S.btnGoldText}>Got it — Let's Play! ✦</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          {/* Game Logo — 20 Questions */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            {/* Icon mark: magnifying glass with "?" inside */}
            <View style={{ marginBottom: 18, alignItems: 'center', justifyContent: 'center' }}>
              {/* Outer ring glow — brighter, thicker */}
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(212,168,74,0.10)', borderWidth: 2.5, borderColor: 'rgba(212,168,74,0.65)', alignItems: 'center', justifyContent: 'center', position: 'absolute' }} />
              {/* Magnifying glass circle — thicker ring */}
              <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: C.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,168,74,0.08)' }}>
                {/* Big question mark */}
                <Text style={{ fontFamily: 'Cinzel_900Black', fontSize: 34, color: C.gold, lineHeight: 38 }}>?</Text>
              </View>
              {/* Magnifying glass handle */}
              <View style={{
                position: 'absolute', bottom: 6, right: 6,
                width: 26, height: 5, borderRadius: 3,
                backgroundColor: C.gold,
                transform: [{ rotate: '45deg' }],
              }} />
            </View>

            {/* "20" large number */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 }}>
              <Text style={{ fontFamily: 'Cinzel_900Black', fontSize: 52, color: C.gold, letterSpacing: 2, lineHeight: 56 }}>20</Text>
            </View>

            {/* "QUESTIONS" subtitle */}
            <Text style={{ fontFamily: 'Cinzel_900Black', fontSize: 15, letterSpacing: 7, color: C.gold, marginBottom: 10 }}>QUESTIONS</Text>

            {/* Decorative divider with tagline */}
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '90%', marginBottom: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(212,168,74,0.25)' }} />
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(212,168,74,0.50)', marginHorizontal: 10 }} />
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(212,168,74,0.25)' }} />
            </View>
            <Text style={{ fontSize: 10, color: C.muted, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Outfit_400Regular' }}>The Art of Deduction</Text>
            <Text style={{ fontSize: 10, color: C.dim, fontFamily: 'Outfit_400Regular', marginTop: 6, letterSpacing: 1 }}>
              v{Constants.expoConfig?.version || '1.2.0'}
            </Text>
          </View>

          {/* Name */}
          <Text style={S.fieldLabel}>Your Name</Text>
          <GlassInput
            containerStyle={{ marginBottom: 8 }}
            placeholder="Enter your name…"
            placeholderTextColor={C.dim}
            value={nameInput}
            onChangeText={setNameInput}
            maxLength={20}
            returnKeyType="done"
          />

          {/* Avatar */}
          <AvatarPicker selected={selectedAvatarIdx} onSelect={setSelectedAvatarIdx} />

          <View style={{ height: 16 }} />

          {/* Play */}
          <TouchableOpacity
            disabled={!nameInput.trim()}
            onPress={() => setScreen('modes')}
            activeOpacity={0.85}
            style={!nameInput.trim() ? { opacity: 0.4 } : {}}
          >
            <View style={{ borderRadius: 16, shadowColor: C.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.40, shadowRadius: 18, elevation: 10 }}>
              <LinearGradient colors={[C.gold2, C.gold, '#a07020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 16, paddingVertical: 17, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 16, color: '#1a0f00', letterSpacing: 0.5 }}>Play</Text>
                <Text style={{ fontFamily: F.serifBold, fontSize: 18, color: '#1a0f00' }}>→</Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          {/* How to Play */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(212,168,74,0.24)', backgroundColor: 'rgba(212,168,74,0.05)' }}
            onPress={() => setHowToPlayOpen(true)}>
            <Text style={{ fontSize: 16 }}>📖</Text>
            <Text style={{ color: C.gold, fontSize: 14, fontFamily: F.sansSemi, letterSpacing: 0.3 }}>How to Play</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── MODES ────────────────────────────────────────────────────────────────
  if (screen === 'modes') {
    return (
      <View style={[S.flex, { backgroundColor: '#05050f', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <PremiumBackground />
        {/* Back + greeting */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 24 }}>
          <TouchableOpacity onPress={() => setScreen('home')} style={{ marginRight: 12 }}>
            <Text style={S.backBtn}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <PlayerAvatar p={{ avatarIdx: selectedAvatarIdx }} size={28} />
            <Text style={{ fontSize: 13, color: C.muted, fontFamily: 'Outfit_500Medium' }}>{nameInput.trim()}</Text>
          </View>
        </View>

        <Text style={{ fontFamily: 'Cinzel_900Black', fontSize: 27, letterSpacing: 5, color: C.gold, marginBottom: 6, paddingHorizontal: 24 }}>20 QUESTIONS</Text>
        <Text style={{ fontFamily: F.sansMed, fontSize: 15, color: C.muted, marginBottom: 22, paddingHorizontal: 24, letterSpacing: 0.2 }}>Choose a game mode to play.</Text>

        {/* Three cards — glass morphism (thicker rims, larger type) */}
        <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'space-evenly' }}>

          {/* Daily Challenge — gold glass */}
          <TouchableOpacity onPress={() => setScreen('daily_setup')} activeOpacity={0.85}>
            <View style={{ borderRadius: 22, shadowColor: C.gold, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.42, shadowRadius: 22, elevation: 12 }}>
              <LinearGradient colors={['rgba(255,236,170,0.92)', 'rgba(212,168,74,0.55)', 'rgba(150,98,22,0.70)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 3 }}>
                <LinearGradient colors={['rgba(212,168,74,0.26)', 'rgba(120,80,15,0.15)', 'rgba(50,30,5,0.30)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 19.5, overflow: 'hidden', padding: 20 }}>
                  <LinearGradient colors={['rgba(255,232,160,0.30)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56 }} />
                  <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 18.5, borderWidth: 1, borderColor: 'rgba(255,232,160,0.20)' }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                    <LinearGradient colors={[C.gold2, C.gold, C.goldDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 }}>
                      <Text style={{ color: '#1a0f00', fontSize: 11, fontFamily: F.sansBold, letterSpacing: 1.5 }}>DAILY</Text>
                    </LinearGradient>
                    <Text style={{ fontSize: 12, color: 'rgba(255,220,140,0.70)', fontFamily: F.sans, letterSpacing: 0.5 }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(212,168,74,0.15)', borderWidth: 1.5, borderColor: 'rgba(255,220,140,0.50)', alignItems: 'center', justifyContent: 'center' }}>
                      <CalendarGlyph size={30} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.serifBold, fontSize: 21, color: C.gold, letterSpacing: 0.5, marginBottom: 5 }}>Daily Challenge</Text>
                      <Text style={{ fontFamily: F.sans, fontSize: 15, color: 'rgba(255,220,140,0.80)', lineHeight: 21 }}>One secret. 20 questions. Crack today's mystery!</Text>
                    </View>
                  </View>
                  <LinearGradient colors={[C.gold2, C.gold, '#a07020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={{ color: '#1a0f00', fontSize: 15, fontFamily: F.sansBold, letterSpacing: 0.5 }}>Play Today's Challenge →</Text>
                  </LinearGradient>
                </LinearGradient>
              </LinearGradient>
            </View>
          </TouchableOpacity>

          {/* Multiplayer — violet glass */}
          <TouchableOpacity onPress={() => setScreen('multi_home')} activeOpacity={0.85}>
            <View style={{ borderRadius: 20, shadowColor: C.violet, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.40, shadowRadius: 18, elevation: 10 }}>
              <LinearGradient colors={['rgba(190,155,255,0.90)', 'rgba(124,58,237,0.52)', 'rgba(76,24,170,0.68)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 3 }}>
                <LinearGradient colors={['rgba(124,58,237,0.22)', 'rgba(80,30,180,0.14)', 'rgba(40,10,90,0.28)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 17.5, overflow: 'hidden', padding: 20 }}>
                  <LinearGradient colors={['rgba(200,160,255,0.24)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50 }} />
                  <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 16.5, borderWidth: 1, borderColor: 'rgba(180,140,255,0.17)' }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(124,58,237,0.20)', borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.42)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 30 }}>👥</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.serifBold, fontSize: 21, color: C.violet2, letterSpacing: 0.5, marginBottom: 5 }}>Multiplayer</Text>
                      <Text style={{ fontFamily: F.sans, fontSize: 15, color: C.muted, lineHeight: 21 }}>Public or private room. One host sets the secret, everyone guesses.</Text>
                    </View>
                    <Text style={{ color: C.violet2, fontSize: 24 }}>›</Text>
                  </View>
                </LinearGradient>
              </LinearGradient>
            </View>
          </TouchableOpacity>

          {/* Solo — emerald glass */}
          <TouchableOpacity onPress={() => setScreen('solo_setup')} activeOpacity={0.85}>
            <View style={{ borderRadius: 20, shadowColor: C.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.38, shadowRadius: 16, elevation: 10 }}>
              <LinearGradient colors={['rgba(120,255,175,0.88)', 'rgba(34,197,94,0.50)', 'rgba(12,110,44,0.66)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 3 }}>
                <LinearGradient colors={['rgba(34,197,94,0.18)', 'rgba(20,120,55,0.12)', 'rgba(5,60,20,0.25)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 17.5, overflow: 'hidden', padding: 20 }}>
                  <LinearGradient colors={['rgba(100,255,160,0.22)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50 }} />
                  <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 16.5, borderWidth: 1, borderColor: 'rgba(100,255,160,0.15)' }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <MascotIcon size={54} uid="mode-solo" pulse={false} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.serifBold, fontSize: 21, color: C.success, letterSpacing: 0.5, marginBottom: 5 }}>Solo Mode</Text>
                      <Text style={{ fontFamily: F.sans, fontSize: 15, color: 'rgba(100,255,160,0.78)', lineHeight: 21 }}>A secret is chosen for you. 20 questions to figure it out.</Text>
                    </View>
                    <Text style={{ color: C.success, fontSize: 24 }}>›</Text>
                  </View>
                </LinearGradient>
              </LinearGradient>
            </View>
          </TouchableOpacity>

        </View>
      </View>
    );
  }

  // ─── MULTIPLAYER HOME ─────────────────────────────────────────────────────
  if (screen === 'multi_home') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: '#05050f' }]}>
        <PremiumBackground />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 36 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('modes')}>
              <Text style={S.backBtn}>← Back</Text>
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(124,58,237,0.14)', borderWidth: 2, borderColor: 'rgba(167,139,250,0.38)', alignItems: 'center', justifyContent: 'center', marginBottom: 18, shadowColor: C.violet, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.40, shadowRadius: 18, elevation: 10 }}>
              <Text style={{ fontSize: 36 }}>👥</Text>
            </View>
            <Text style={{ fontFamily: F.serifBlack, fontSize: 26, color: C.text, letterSpacing: 1.5, marginBottom: 8 }}>MULTIPLAYER</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '70%', marginBottom: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(124,58,237,0.25)' }} />
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(167,139,250,0.45)', marginHorizontal: 8 }} />
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(124,58,237,0.25)' }} />
            </View>
            <Text style={{ fontFamily: F.sans, fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, maxWidth: 260 }}>
              Gather your friends. One host picks the secret,{'\n'}everyone else deduces.
            </Text>
          </View>

          {/* Create card — gold glass */}
          <TouchableOpacity onPress={() => setScreen('create')} activeOpacity={0.85} style={{ marginBottom: 14 }}>
            <View style={{ borderRadius: 20, shadowColor: C.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.30, shadowRadius: 18, elevation: 10 }}>
              <LinearGradient colors={['rgba(255,232,160,0.68)', 'rgba(212,168,74,0.28)', 'rgba(140,90,18,0.44)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 1.5 }}>
                <LinearGradient colors={['rgba(212,168,74,0.20)', 'rgba(100,65,10,0.13)', 'rgba(40,25,5,0.26)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 18.5, overflow: 'hidden', padding: 20 }}>
                  <LinearGradient colors={['rgba(255,232,160,0.26)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 52 }} />
                  <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 17.5, borderWidth: 1, borderColor: 'rgba(255,232,160,0.13)' }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(212,168,74,0.16)', borderWidth: 1.5, borderColor: 'rgba(255,220,140,0.40)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.serifBold, fontSize: 22, color: C.gold }}>✦</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.serifBold, fontSize: 17, color: C.gold, letterSpacing: 0.5, marginBottom: 3 }}>Create New Game</Text>
                      <Text style={{ fontFamily: F.sans, fontSize: 13, color: 'rgba(255,220,140,0.65)', lineHeight: 18 }}>Start a private or public room as host</Text>
                    </View>
                    <Text style={{ color: C.gold, fontSize: 22 }}>›</Text>
                  </View>
                </LinearGradient>
              </LinearGradient>
            </View>
          </TouchableOpacity>

          {/* OR divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            <Text style={{ fontFamily: F.sansMed, fontSize: 11, color: C.dim, letterSpacing: 2 }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>

          {/* Join card — violet glass */}
          <TouchableOpacity onPress={() => setScreen('join')} activeOpacity={0.85} style={{ marginTop: 14, marginBottom: 6 }}>
            <View style={{ borderRadius: 20, shadowColor: C.violet, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 8 }}>
              <LinearGradient colors={['rgba(180,140,255,0.58)', 'rgba(124,58,237,0.24)', 'rgba(70,20,160,0.40)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 1.5 }}>
                <LinearGradient colors={['rgba(124,58,237,0.18)', 'rgba(70,25,150,0.11)', 'rgba(30,8,80,0.24)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 18.5, overflow: 'hidden', padding: 20 }}>
                  <LinearGradient colors={['rgba(180,140,255,0.20)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50 }} />
                  <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 17.5, borderWidth: 1, borderColor: 'rgba(180,140,255,0.11)' }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(124,58,237,0.18)', borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.38)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 24 }}>🔑</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.serifBold, fontSize: 17, color: C.violet2, letterSpacing: 0.5, marginBottom: 3 }}>Join with a Code</Text>
                      <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, lineHeight: 18 }}>Enter the 6-letter code from your host</Text>
                    </View>
                    <Text style={{ color: C.violet2, fontSize: 22 }}>›</Text>
                  </View>
                </LinearGradient>
              </LinearGradient>
            </View>
          </TouchableOpacity>

          {/* Browse public rooms link */}
          <TouchableOpacity onPress={() => setScreen('rooms')} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, marginTop: 6 }}>
            <Text style={{ fontFamily: F.sansMed, fontSize: 13, color: C.dim }}>🌐</Text>
            <Text style={{ fontFamily: F.sansMed, fontSize: 13, color: C.dim, letterSpacing: 0.3 }}>Browse public rooms</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── DAILY SETUP ──────────────────────────────────────────────────────────
  if (screen === 'daily_setup') {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: '#05050f' }]}>
        <PremiumBackground />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('modes')}>
              <Text style={S.backBtn}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <CalendarGlyph size={52} />
            <Text style={[S.tH1, { color: C.gold, marginTop: 12, letterSpacing: 2 }]}>
              Daily Challenge
            </Text>
            <Text style={[S.tBodySm, { color: C.muted, marginTop: 6 }]}>{dateStr}</Text>
          </View>

          <View style={[S.infoCard, { marginBottom: 24 }]}>
            <Text style={{ color: C.text, fontFamily: 'Outfit_600SemiBold', fontSize: 14, marginBottom: 8 }}>How it works</Text>
            <Text style={[S.bodyText, { lineHeight: 22 }]}>
              {'• A secret is chosen for today — same for everyone worldwide.\n'}
              {'• You have '}
              <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>20 questions</Text>
              {' to figure it out.\n'}
              {'• The AI host answers '}
              <Text style={{ color: C.success, fontFamily: 'Outfit_700Bold' }}>Yes</Text>
              {', '}
              <Text style={{ color: C.danger, fontFamily: 'Outfit_700Bold' }}>No</Text>
              {' or '}
              <Text style={{ color: C.warn, fontFamily: 'Outfit_700Bold' }}>Partly</Text>
              {'.\n'}
              {'• Tap Solve when you know the answer!'}
            </Text>
          </View>

          <TouchableOpacity style={S.btnGold} onPress={startDailyChallenge}>
            <Text style={S.btnGoldText}>Start Challenge →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── DAILY GAME ───────────────────────────────────────────────────────────
  if (screen === 'daily_game' && dailyChallenge) {
    const qCount = dailyQuestions.filter(q => !q.type).length;
    const qLimit = 20;
    const limitReached = qCount >= qLimit;
    const lastEntry = dailyQuestions[dailyQuestions.length - 1];
    const lastAnswered = !lastEntry || lastEntry.type === 'hint' || lastEntry.answer !== null;
    const canAsk = !limitReached && !dailyLoading && lastAnswered;

    return (
      <View style={[S.flex, { backgroundColor: '#05050f' }]}>
      <PremiumBackground />
        {/* Ad simulation modal */}
        <Modal visible={adModalVisible} animationType="fade" transparent onRequestClose={() => {}}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{ width: '100%', backgroundColor: C.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
              <View style={{ backgroundColor: '#1a1a2e', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: C.dim, fontFamily: 'Outfit_700Bold', letterSpacing: 2 }}>ADVERTISEMENT</Text>
                {!adReady && (
                  <View style={{ backgroundColor: 'rgba(212,168,74,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: C.goldDim }}>
                    <Text style={{ fontSize: 12, color: C.gold, fontFamily: 'Outfit_700Bold' }}>{adCountdown}s</Text>
                  </View>
                )}
              </View>
              <View style={{ height: 200, backgroundColor: '#0d0d1f', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Text style={{ fontSize: 48 }}>🎮</Text>
                <Text style={[S.tH3, { color: C.gold, letterSpacing: 1 }]}>20 Questions</Text>
                <Text style={[S.tBodySm, { color: C.muted }]}>Challenge your friends today</Text>
              </View>
              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, backgroundColor: 'rgba(212,168,74,0.07)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(212,168,74,0.2)' }}>
                  <Text style={{ fontSize: 20 }}>💡</Text>
                  <View>
                    <Text style={{ fontSize: 11, color: C.dim, fontFamily: 'Outfit_400Regular' }}>You will receive</Text>
                    <Text style={{ fontSize: 14, color: C.gold, fontFamily: 'Outfit_700Bold' }}>Hint {(pendingHintMode === 'solo' ? soloHintsUsed : dailyHintsUsed) + 1} of 2</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[S.btnGold, !adReady && { opacity: 0.4 }]}
                  onPress={collectHint}
                  disabled={!adReady}
                >
                  <Text style={S.btnGoldText}>{adReady ? '✓ Collect Hint' : `Please wait… ${adCountdown}s`}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Solve modal */}
        <Modal visible={dailySolveOpen} animationType="slide" transparent onRequestClose={() => setDailySolveOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={S.overlay}>
            <View style={S.modal}>
              <View style={S.modalHandle} />
              <Text style={S.modalTitle}>💡 Make Your Guess</Text>
              <Text style={[S.modalSub, { marginBottom: 16 }]}>What is the secret? Type your answer below.</Text>
              <GlassInput
                accent={C.gold}
                containerStyle={{ marginBottom: 16 }}
                placeholder="Your answer..."
                placeholderTextColor={C.dim}
                value={dailySolveInput}
                onChangeText={setDailySolveInput}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={() => finishDailyChallenge(dailySolveInput)}
              />
              <TouchableOpacity
                style={[S.btnGold, !dailySolveInput.trim() && S.btnDisabled]}
                onPress={() => finishDailyChallenge(dailySolveInput)}
                disabled={!dailySolveInput.trim()}
              >
                <Text style={S.btnGoldText}>Submit Answer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.btnOutline, { marginTop: 10 }]} onPress={() => setDailySolveOpen(false)}>
                <Text style={S.btnOutlineText}>Ask More Questions First</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Header */}
        <View style={{
          backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border2,
          paddingTop: insets.top + 10, paddingBottom: 12, paddingHorizontal: 16,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <TouchableOpacity onPress={() => {
            Alert.alert('Abandon Challenge?', 'Your progress will be lost.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: () => setScreen('modes') },
            ]);
          }}>
            <Text style={S.backBtn}>← Home</Text>
          </TouchableOpacity>
          <Text style={[S.tH3, { color: C.gold }]}>Daily Challenge</Text>
          <ProgressCounter count={qCount} limit={qLimit} />
        </View>

        {/* Category banner — premium gold glass morphism panel */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
          <View style={{
            borderRadius: 22,
            shadowColor: C.gold,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 22,
            elevation: 14,
          }}>
            {/* Outer gold accent frame */}
            <LinearGradient
              colors={['rgba(255,232,160,0.75)', 'rgba(212,168,74,0.30)', 'rgba(140,90,18,0.50)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 22, padding: 1.5 }}
            >
              {/* Glass body */}
              <LinearGradient
                colors={['rgba(212,168,74,0.30)', 'rgba(150,100,20,0.18)', 'rgba(60,40,10,0.30)']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}
                style={{ borderRadius: 20.5, overflow: 'hidden' }}
              >
                {/* Soft inner top-edge glow */}
                <LinearGradient
                  colors={['rgba(255,232,160,0.32)', 'transparent']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44 }}
                />
                {/* Inner hairline highlight */}
                <View style={{
                  position: 'absolute', top: 1, left: 1, right: 1, bottom: 1,
                  borderRadius: 19.5, borderWidth: 1,
                  borderColor: 'rgba(255,232,160,0.18)',
                }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingVertical: 18 }}>
                  {/* Icon in glass medallion with gold ring */}
                  <View style={{
                    width: 58, height: 58, borderRadius: 29,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: 'rgba(255,232,160,0.6)',
                    shadowColor: '#d4a84a', shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.55, shadowRadius: 8, elevation: 6,
                    overflow: 'hidden',
                  }}>
                    <LinearGradient
                      colors={['rgba(255,225,140,0.28)', 'rgba(150,100,20,0.32)']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Text style={{ fontSize: 30 }}>{dailyChallenge.categoryIcon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: 'rgba(255,224,150,0.9)', fontFamily: 'Outfit_700Bold', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 5 }}>
                      Today · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={{ fontFamily: 'Cinzel_900Black', fontSize: 21, color: '#fff', letterSpacing: 0.5, textShadowColor: 'rgba(212,168,74,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
                      {dailyChallenge.categoryLabel}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </LinearGradient>
          </View>
        </View>

        {/* Q&A feed + input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          ref={feedScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
          onContentSizeChange={() => feedScrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {/* Dialogue card — Daily Challenge host */}
          {dailyQuestions.length === 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{
                borderRadius: 24,
                shadowColor: C.gold,
                shadowOffset: { width: 0, height: 14 },
                shadowOpacity: 0.40,
                shadowRadius: 28,
                elevation: 14,
              }}>
                <LinearGradient
                  colors={['rgba(255,232,160,0.65)', 'rgba(212,168,74,0.22)', 'rgba(130,85,14,0.55)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 24, padding: 1.5 }}
                >
                  <LinearGradient
                    colors={['rgba(45,30,8,0.96)', 'rgba(30,20,5,0.93)', 'rgba(12,8,3,0.97)']}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 1 }}
                    style={{ borderRadius: 23, overflow: 'hidden' }}
                  >
                    {/* Cinematic top-light sweep */}
                    <LinearGradient
                      colors={['rgba(255,210,90,0.22)', 'rgba(212,168,74,0.07)', 'transparent']}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90 }}
                    />
                    {/* Left-edge accent glow */}
                    <LinearGradient
                      colors={['rgba(255,225,140,0.30)', 'transparent']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3 }}
                    />

                    {/* Status bar */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 20 }}>
                      <View style={{
                        width: 7, height: 7, borderRadius: 3.5,
                        backgroundColor: C.gold,
                        shadowColor: C.gold, shadowRadius: 6, shadowOpacity: 1, elevation: 3,
                      }} />
                      <Text style={{ fontSize: 10, color: 'rgba(255,210,130,0.72)', fontFamily: 'Outfit_700Bold', letterSpacing: 3, textTransform: 'uppercase' }}>
                        Daily Challenge · Worldwide
                      </Text>
                    </View>

                    {/* Avatar medallion */}
                    <View style={{ alignItems: 'center', paddingTop: 22, paddingBottom: 18 }}>
                      <View style={{
                        width: 84, height: 84, borderRadius: 42,
                        shadowColor: C.gold, shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.65, shadowRadius: 16, elevation: 10,
                      }}>
                        <View style={{
                          width: 84, height: 84, borderRadius: 42,
                          borderWidth: 1.5, borderColor: 'rgba(255,210,100,0.52)',
                          overflow: 'hidden',
                        }}>
                          <LinearGradient
                            colors={['rgba(212,168,74,0.48)', 'rgba(45,28,6,0.90)']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                          />
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 44 }}>🌍</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Copy */}
                    <View style={{ paddingHorizontal: 22, paddingBottom: 22, alignItems: 'center' }}>
                      <Text style={{
                        fontFamily: 'Cinzel_700Bold', fontSize: 18, color: C.gold,
                        letterSpacing: 0.8, textAlign: 'center', lineHeight: 27,
                        textShadowColor: 'rgba(212,168,74,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
                        marginBottom: 10,
                      }}>
                        One Secret. Everyone. Today.
                      </Text>
                      <Text style={{ fontSize: 14, color: 'rgba(225,195,145,0.88)', fontFamily: 'Outfit_400Regular', textAlign: 'center', lineHeight: 22 }}>
                        The same mystery challenges players worldwide.
                      </Text>

                      {/* Separator */}
                      <LinearGradient
                        colors={['transparent', 'rgba(212,168,74,0.45)', 'transparent']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ width: '100%', height: 1, marginVertical: 18 }}
                      />

                      {/* Info row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12 }}>
                        <Text style={{ flex: 1, fontSize: 13, color: 'rgba(220,195,140,0.82)', fontFamily: 'Outfit_400Regular', lineHeight: 20 }}>
                          Ask yes/no questions — you have{' '}
                          <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>20 questions</Text>{' '}
                          to crack the secret.
                        </Text>
                        <View style={{
                          backgroundColor: 'rgba(212,168,74,0.10)',
                          borderWidth: 1, borderColor: 'rgba(212,168,74,0.42)',
                          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
                          alignItems: 'center',
                        }}>
                          <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 17, color: C.gold, lineHeight: 20 }}>20</Text>
                          <Text style={{ fontSize: 9, color: 'rgba(212,168,74,0.65)', fontFamily: 'Outfit_700Bold', letterSpacing: 1.5 }}>ASKS</Text>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </LinearGradient>
              </View>
            </View>
          )}
          {dailyQuestions.map((q, i) => {
            if (q.type === 'hint') {
              return <HintCard key={q.id} hintNum={q.hintNum} text={q.text} />;
            }
            const qNum = dailyQuestions.slice(0, i + 1).filter(x => !x.type).length;
            return <QACard key={q.id} num={qNum} text={q.text} answer={q.answer} accent="gold" />;
          })}
          {limitReached && (
            <View style={{ backgroundColor: 'rgba(248,81,73,0.08)', borderWidth: 1, borderColor: 'rgba(248,81,73,0.3)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <Text style={{ color: C.danger, fontFamily: 'Outfit_600SemiBold', fontSize: 14, textAlign: 'center' }}>
                20 questions used — time to make your guess!
              </Text>
            </View>
          )}

          {/* Question composer — clearly delineated input zone */}
          {!limitReached && (
            <View style={{ marginTop: 20 }}>
              {/* Eyebrow label with dividers, so the input never gets lost in the feed */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(212,168,74,0.22)' }} />
                <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.gold }}>Ask a yes / no question</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(212,168,74,0.22)' }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <GlassInput
                  accent={C.gold}
                  containerStyle={{ flex: 1 }}
                  style={{ fontSize: 16, paddingVertical: 17 }}
                  placeholder={canAsk ? 'e.g. Is it a person?' : dailyLoading ? 'Waiting for AI…' : 'Wait for the answer…'}
                  placeholderTextColor={C.dim}
                  value={dailyInput}
                  onChangeText={setDailyInput}
                  editable={canAsk}
                  returnKeyType="send"
                  onSubmitEditing={() => askDailyQuestion(dailyInput)}
                />
                <PremiumButton
                  square
                  icon={<SendGlyph size={20} />}
                  onPress={() => askDailyQuestion(dailyInput)}
                  disabled={!canAsk || !dailyInput.trim()}
                />
              </View>
            </View>
          )}

          {/* Hint button — below input */}
          {dailyHintsUsed < 2 && (
            <HintButton nextHint={dailyHintsUsed + 1} onPress={() => openAdForHint('daily')} />
          )}
        </ScrollView>

        {/* Solve button — fixed at very bottom, bold gold */}
        <View style={{ backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border2, padding: 14, paddingBottom: insets.bottom + 14 }}>
          <SolveButton onPress={() => { setDailySolveInput(''); setDailySolveOpen(true); }} />
        </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── DAILY RESULT ─────────────────────────────────────────────────────────
  if (screen === 'daily_result' && dailyResult && dailyChallenge) {
    const { solved, questionsUsed, timeSeconds } = dailyResult;
    const mins = Math.floor(timeSeconds / 60);
    const secs = timeSeconds % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    return (
      <View style={[S.flex, { backgroundColor: '#05050f' }]}>
      <PremiumBackground />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
          {/* Result hero */}
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Text style={{ fontSize: 56, marginBottom: 10 }}>{solved ? '🎉' : '😔'}</Text>
            <Text style={[S.tH1, { color: solved ? C.gold : C.muted, letterSpacing: 2 }]}>
              {solved ? 'You Solved It!' : 'Better Luck Tomorrow'}
            </Text>
            <Text style={[S.tBodySm, { color: C.muted, marginTop: 8 }]}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>

          {/* Secret reveal */}
          <View style={{ backgroundColor: 'rgba(109,40,217,0.08)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16 }}>
            <Text style={[S.tLabel, { color: C.dim, letterSpacing: 3, marginBottom: 8 }]}>Today's Secret</Text>
            <Text style={[S.tH1, { color: C.gold, textAlign: 'center' }]}>{dailyChallenge.secret}</Text>
            <Text style={[S.tCaption, { color: C.muted, marginTop: 6 }]}>{dailyChallenge.categoryIcon} {dailyChallenge.categoryLabel}</Text>
          </View>

          {/* Educational data card */}
          {(dailyChallenge.facts || []).length > 0 && (
            <View style={[S.infoCard, { marginBottom: 16 }]}>
              <Text style={[S.tOverline, { letterSpacing: 3, marginBottom: 14 }]}>📖 About This Secret</Text>
              {(dailyChallenge.facts || []).map((fact, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottomWidth: i < dailyChallenge.facts.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(109,40,217,0.18)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Text style={{ fontSize: 11, color: C.violet2, fontFamily: 'Outfit_700Bold' }}>{i + 1}</Text>
                  </View>
                  <Text style={[S.tBodySm, { flex: 1, color: C.text, lineHeight: 20 }]}>{fact}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <View style={[S.infoCard, { flex: 1, alignItems: 'center' }]}>
              <Text style={{ fontSize: 24, fontFamily: 'Cinzel_700Bold', color: C.violet2 }}>{questionsUsed}</Text>
              <Text style={[S.tLabel, { color: C.dim, letterSpacing: 1 }]}>Questions</Text>
            </View>
            <View style={[S.infoCard, { flex: 1, alignItems: 'center' }]}>
              <Text style={{ fontSize: 24, fontFamily: 'Cinzel_700Bold', color: C.violet2 }}>{timeStr}</Text>
              <Text style={{ fontSize: 11, color: C.dim, fontFamily: 'Outfit_400Regular', textTransform: 'uppercase', letterSpacing: 1 }}>Time</Text>
            </View>
          </View>

          {/* Leaderboard */}
          {dailyLeaderboard.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={[S.sectionLabel, { marginBottom: 12 }]}>🏆 Today's Leaderboard</Text>
              {dailyLeaderboard.map((row, i) => (
                <View key={i} style={[S.sbRow, i === 0 && S.sbRowFirst, { marginBottom: 6 }]}>
                  <Text style={[S.sbRank, { fontSize: 14 }]}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: C.text, fontFamily: 'Outfit_500Medium' }}>{row.player_name}</Text>
                  <Text style={{ fontSize: 12, color: row.solved ? C.success : C.danger, fontFamily: 'Outfit_600SemiBold', marginRight: 8 }}>
                    {row.solved ? '✓' : '✗'} {row.questions_used}Q
                  </Text>
                  <Text style={[S.tCaption, { color: C.dim }]}>
                    {Math.floor(row.time_seconds / 60) > 0 ? `${Math.floor(row.time_seconds / 60)}m ` : ''}{row.time_seconds % 60}s
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={S.btnGold} onPress={() => setScreen('modes')}>
            <Text style={S.btnGoldText}>Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.btnOutline, { marginTop: 10 }]} onPress={() => setScreen('multi_home')}>
            <Text style={S.btnOutlineText}>👥 Play Multiplayer</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── SOLO SETUP ──────────────────────────────────────────────────────────
  if (screen === 'solo_setup') {
    const isJunior = soloTier === 'junior';
    return (
      <View style={[S.flex, { backgroundColor: '#05050f' }]}>
      <PremiumBackground />
      <ScrollView style={S.flex} contentContainerStyle={[S.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
        <View style={S.screenHeader}>
          <TouchableOpacity onPress={() => setScreen('modes')}><Text style={S.backBtn}>← Back</Text></TouchableOpacity>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <View style={{ marginBottom: 10 }}><MascotIcon size={88} uid="setup" /></View>
          <Text style={[S.tH1, { letterSpacing: 1.5 }]}>Solo Mode</Text>
          <Text style={[S.tBodySm, { marginTop: 6, textAlign: 'center' }]}>
            The AI hides a secret. You have 20 questions to crack it.
          </Text>
        </View>

        {/* ── Tier Picker ── */}
        <Text style={[S.sectionLabel, { marginTop: 4, marginBottom: 12 }]}>Choose Your Level</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {/* Junior tile */}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => { setSoloTier('junior'); setSoloCategory('random'); }}
          >
            {isJunior ? (
              <LinearGradient
                colors={['rgba(255,200,130,0.72)', 'rgba(255,107,53,0.35)', 'rgba(180,60,20,0.50)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 1.5 }}
              >
                <View style={{ borderRadius: 14.5, backgroundColor: 'rgba(255,107,53,0.14)', padding: 16, alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 28 }}>🌟</Text>
                  <Text style={{ fontFamily: F.serifBold, fontSize: 16, color: '#ff6b35', textAlign: 'center' }}>Junior</Text>
                  <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 16 }}>Fun categories{'\n'}Easy clues · Learn as you play</Text>
                </View>
              </LinearGradient>
            ) : (
              <View style={{ borderRadius: 16, borderWidth: 1.5, borderColor: C.border2, backgroundColor: C.card, padding: 16, alignItems: 'center', gap: 6, opacity: 0.6 }}>
                <Text style={{ fontSize: 28 }}>🌟</Text>
                <Text style={{ fontFamily: F.serifBold, fontSize: 16, color: C.muted, textAlign: 'center' }}>Junior</Text>
                <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.dim, textAlign: 'center', lineHeight: 16 }}>Fun categories{'\n'}Easy clues · Learn as you play</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Scholar tile */}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => { setSoloTier('senior'); setSoloCategory('random'); }}
          >
            {!isJunior ? (
              <LinearGradient
                colors={['rgba(216,180,254,0.72)', 'rgba(124,58,237,0.35)', 'rgba(60,20,120,0.50)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 1.5 }}
              >
                <View style={{ borderRadius: 14.5, backgroundColor: 'rgba(124,58,237,0.14)', padding: 16, alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 28 }}>📚</Text>
                  <Text style={{ fontFamily: F.serifBold, fontSize: 16, color: C.violet2, textAlign: 'center' }}>Scholar</Text>
                  <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 16 }}>Deep trivia · Tougher secrets{'\n'}For seasoned players</Text>
                </View>
              </LinearGradient>
            ) : (
              <View style={{ borderRadius: 16, borderWidth: 1.5, borderColor: C.border2, backgroundColor: C.card, padding: 16, alignItems: 'center', gap: 6, opacity: 0.6 }}>
                <Text style={{ fontSize: 28 }}>📚</Text>
                <Text style={{ fontFamily: F.serifBold, fontSize: 16, color: C.muted, textAlign: 'center' }}>Scholar</Text>
                <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.dim, textAlign: 'center', lineHeight: 16 }}>Deep trivia · Tougher secrets{'\n'}For seasoned players</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[S.sectionLabel, { marginTop: 0, marginBottom: 12 }]}>Choose a Category</Text>

        {isJunior ? (
          <>
            {/* Random tile — Junior */}
            <TouchableOpacity
              onPress={() => setSoloCategory('random')}
              style={{ backgroundColor: soloCategory === 'random' ? 'rgba(255,107,53,0.10)' : C.card, borderWidth: 1.5, borderColor: soloCategory === 'random' ? '#ff6b35' : C.border2, borderRadius: 14, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Text style={{ fontSize: 28 }}>🎲</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: soloCategory === 'random' ? '#ff6b35' : C.text }}>Random — Surprise Me 🎲</Text>
                <Text style={[S.tCaption, { color: C.muted, marginTop: 2 }]}>Pick from all Junior categories</Text>
              </View>
              {soloCategory === 'random' && <Text style={{ color: '#ff6b35', fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>

            {/* 2-column grid of JUNIOR_THEMES */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {JUNIOR_THEMES.map((t) => {
                const sel = soloCategory === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setSoloCategory(t.id)}
                    style={{ width: '48%' }}
                  >
                    {sel ? (
                      <LinearGradient
                        colors={[`${t.color}b8`, `${t.color}59`, `${t.color}80`]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ borderRadius: 16, padding: 1.5 }}
                      >
                        <View style={{ borderRadius: 14.5, backgroundColor: `${t.color}22`, padding: 16, alignItems: 'flex-start', gap: 4 }}>
                          <Text style={{ fontSize: 30, marginBottom: 4 }}>{t.icon}</Text>
                          <Text style={{ fontFamily: F.sansBold, fontSize: 14, color: t.color }}>{t.label}</Text>
                          <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.muted, marginTop: 2 }}>{t.desc}</Text>
                          <Text style={{ color: t.color, fontSize: 16, marginTop: 4 }}>✓</Text>
                        </View>
                      </LinearGradient>
                    ) : (
                      <View style={{ borderRadius: 16, borderWidth: 1.5, borderColor: C.border2, backgroundColor: C.card, padding: 16, alignItems: 'flex-start', gap: 4 }}>
                        <Text style={{ fontSize: 30, marginBottom: 4 }}>{t.icon}</Text>
                        <Text style={{ fontFamily: F.sansBold, fontSize: 14, color: C.text }}>{t.label}</Text>
                        <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.muted, marginTop: 2 }}>{t.desc}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {/* Random tile — Scholar */}
            <TouchableOpacity
              onPress={() => setSoloCategory('random')}
              style={{ backgroundColor: soloCategory === 'random' ? 'rgba(212,168,74,0.1)' : C.card, borderWidth: 1.5, borderColor: soloCategory === 'random' ? C.gold : C.border2, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Text style={{ fontSize: 28 }}>🎲</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: soloCategory === 'random' ? C.gold : C.text }}>Any Category</Text>
                <Text style={[S.tCaption, { color: C.muted, marginTop: 2 }]}>Surprise me — pick from all categories</Text>
              </View>
              {soloCategory === 'random' && <Text style={{ color: C.gold, fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>

            {/* Theme tiles */}
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setSoloCategory(t.id)}
                style={{ backgroundColor: soloCategory === t.id ? 'rgba(212,168,74,0.1)' : C.card, borderWidth: 1.5, borderColor: soloCategory === t.id ? C.gold : C.border2, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Text style={{ fontSize: 28 }}>{t.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: soloCategory === t.id ? C.gold : C.text }}>{t.label}</Text>
                  <Text style={[S.tCaption, { color: C.muted, marginTop: 2 }]}>{t.desc}</Text>
                </View>
                {soloCategory === t.id && <Text style={{ color: C.gold, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 16 }} />
        {isJunior ? (
          <TouchableOpacity onPress={startSoloChallenge} style={{ borderRadius: 14, overflow: 'hidden' }}>
            <LinearGradient
              colors={['#ffb347', '#ff6b35', '#cc4400']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 14 }}
            >
              <Text style={{ fontFamily: F.sansBold, fontSize: 16, color: '#fff', letterSpacing: 0.5 }}>Start Junior Game! 🌟</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={S.btnGold} onPress={startSoloChallenge}>
            <Text style={S.btnGoldText}>Start Game →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      </View>
    );
  }

  // ─── SOLO GAME ────────────────────────────────────────────────────────────
  if (screen === 'solo_game' && soloChallenge) {
    const qCount = soloQuestions.filter(q => !q.type).length;
    const qLimit = 20;
    const limitReached = qCount >= qLimit;
    const lastEntry = soloQuestions[soloQuestions.length - 1];
    const lastAnswered = !lastEntry || lastEntry.type === 'hint' || lastEntry.answer !== null;
    const canAsk = !limitReached && !soloLoading && lastAnswered;

    return (
      <View style={[S.flex, { backgroundColor: '#05050f' }]}>
      <PremiumBackground />
        {/* Ad simulation modal */}
        <Modal visible={adModalVisible} animationType="fade" transparent onRequestClose={() => {}}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{ width: '100%', backgroundColor: C.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
              {/* Ad label */}
              <View style={{ backgroundColor: '#1a1a2e', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: C.dim, fontFamily: 'Outfit_700Bold', letterSpacing: 2 }}>ADVERTISEMENT</Text>
                {!adReady && (
                  <View style={{ backgroundColor: 'rgba(212,168,74,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: C.goldDim }}>
                    <Text style={{ fontSize: 12, color: C.gold, fontFamily: 'Outfit_700Bold' }}>{adCountdown}s</Text>
                  </View>
                )}
              </View>
              {/* Fake ad content */}
              <View style={{ height: 200, backgroundColor: '#0d0d1f', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Text style={{ fontSize: 48 }}>🎮</Text>
                <Text style={[S.tH3, { color: C.gold, letterSpacing: 1 }]}>20 Questions</Text>
                <Text style={[S.tBodySm, { color: C.muted }]}>Challenge your friends today</Text>
              </View>
              {/* Reward notice + button */}
              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, backgroundColor: 'rgba(212,168,74,0.07)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(212,168,74,0.2)' }}>
                  <Text style={{ fontSize: 20 }}>💡</Text>
                  <View>
                    <Text style={{ fontSize: 11, color: C.dim, fontFamily: 'Outfit_400Regular' }}>You will receive</Text>
                    <Text style={{ fontSize: 14, color: C.gold, fontFamily: 'Outfit_700Bold' }}>Hint {(pendingHintMode === 'solo' ? soloHintsUsed : dailyHintsUsed) + 1} of 2</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[S.btnGold, !adReady && { opacity: 0.4 }]}
                  onPress={collectHint}
                  disabled={!adReady}
                >
                  <Text style={S.btnGoldText}>{adReady ? '✓ Collect Hint' : `Please wait… ${adCountdown}s`}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Solve modal */}
        <Modal visible={soloSolveOpen} animationType="slide" transparent onRequestClose={() => setSoloSolveOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={S.overlay}>
              <View style={S.modal}>
                <View style={S.modalHandle} />
                <Text style={S.modalTitle}>💡 Make Your Guess</Text>
                <Text style={[S.modalSub, { marginBottom: 16 }]}>What is the secret? Type your answer below.</Text>
                <GlassInput
                  accent={C.violet}
                  containerStyle={{ marginBottom: 16 }}
                  placeholder="Your answer…"
                  placeholderTextColor={C.dim}
                  value={soloSolveInput}
                  onChangeText={setSoloSolveInput}
                  autoFocus returnKeyType="go"
                  onSubmitEditing={() => finishSoloChallenge(soloSolveInput)}
                />
                <TouchableOpacity style={[S.btnGold, !soloSolveInput.trim() && S.btnDisabled]} onPress={() => finishSoloChallenge(soloSolveInput)} disabled={!soloSolveInput.trim()}>
                  <Text style={S.btnGoldText}>Submit Answer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.btnOutline, { marginTop: 10 }]} onPress={() => setSoloSolveOpen(false)}>
                  <Text style={S.btnOutlineText}>Ask More Questions First</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Header */}
        <View style={{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border2, paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity onPress={() => Alert.alert('Abandon Game?', 'Your progress will be lost.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: () => setScreen('modes') },
            ])}>
              <Text style={S.backBtn}>← Modes</Text>
            </TouchableOpacity>
            <Text style={[S.tH3, { color: C.text, letterSpacing: 1 }]}>Solo Mode</Text>
            <ProgressCounter count={qCount} limit={qLimit} />
          </View>
          {/* Category panel — royal purple glass morphism */}
          <View style={{
            borderRadius: 22,
            shadowColor: '#7c3aed',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.55,
            shadowRadius: 22,
            elevation: 14,
          }}>
            {/* Outer gold accent frame */}
            <LinearGradient
              colors={['rgba(255,224,140,0.55)', 'rgba(212,168,74,0.18)', 'rgba(150,100,20,0.40)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 22, padding: 1.5 }}
            >
              {/* Glass body */}
              <LinearGradient
                colors={['rgba(124,58,237,0.34)', 'rgba(76,29,149,0.22)', 'rgba(30,12,70,0.30)']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}
                style={{ borderRadius: 20.5, overflow: 'hidden' }}
              >
                {/* Soft inner top-edge glow */}
                <LinearGradient
                  colors={['rgba(216,180,254,0.30)', 'transparent']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44 }}
                />
                {/* Inner hairline highlight */}
                <View style={{
                  position: 'absolute', top: 1, left: 1, right: 1, bottom: 1,
                  borderRadius: 19.5, borderWidth: 1,
                  borderColor: 'rgba(216,180,254,0.16)',
                }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingVertical: 18 }}>
                  {/* Icon in glass medallion with gold ring */}
                  <View style={{
                    width: 58, height: 58, borderRadius: 29,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: 'rgba(255,224,140,0.55)',
                    shadowColor: '#d4a84a', shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
                    overflow: 'hidden',
                  }}>
                    <LinearGradient
                      colors={['rgba(167,139,250,0.28)', 'rgba(76,29,149,0.30)']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Text style={{ fontSize: 32 }}>{soloChallenge.categoryIcon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: 'rgba(216,196,255,0.85)', fontFamily: 'Outfit_700Bold', letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 6 }}>Category</Text>
                    <Text style={{ fontFamily: 'Cinzel_900Black', fontSize: 21, color: '#fff', letterSpacing: 0.5, textShadowColor: 'rgba(124,58,237,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>{soloChallenge.categoryLabel}</Text>
                  </View>
                </View>
              </LinearGradient>
            </LinearGradient>
          </View>
        </View>

        {/* Q&A feed + input (input lives in scroll so it sits right below the card) */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView ref={feedScrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 16 }} onContentSizeChange={() => feedScrollRef.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
            {/* Dialogue card — premium AI game host */}
            {qCount === 0 && (
              <View style={{ marginBottom: 16 }}>
                {/* Outer glow wrapper */}
                <View style={{
                  borderRadius: 24,
                  shadowColor: '#7c3aed',
                  shadowOffset: { width: 0, height: 14 },
                  shadowOpacity: 0.5,
                  shadowRadius: 28,
                  elevation: 14,
                }}>
                  {/* Gradient accent border ring */}
                  <LinearGradient
                    colors={['rgba(216,180,254,0.60)', 'rgba(124,58,237,0.22)', 'rgba(70,30,140,0.50)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 24, padding: 1.5 }}
                  >
                    {/* Glass body */}
                    <LinearGradient
                      colors={['rgba(28,14,60,0.95)', 'rgba(18,9,44,0.92)', 'rgba(8,5,22,0.97)']}
                      locations={[0, 0.55, 1]}
                      start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 1 }}
                      style={{ borderRadius: 23, overflow: 'hidden' }}
                    >
                      {/* Cinematic top-light sweep */}
                      <LinearGradient
                        colors={['rgba(167,139,250,0.26)', 'rgba(124,58,237,0.08)', 'transparent']}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90 }}
                      />
                      {/* Left-edge accent glow */}
                      <LinearGradient
                        colors={['rgba(216,180,254,0.28)', 'transparent']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3 }}
                      />

                      {/* Status bar */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 20 }}>
                        <View style={{
                          width: 7, height: 7, borderRadius: 3.5,
                          backgroundColor: '#a78bfa',
                          shadowColor: '#7c3aed', shadowRadius: 6, shadowOpacity: 1, elevation: 3,
                        }} />
                        <Text style={{ fontSize: 10, color: 'rgba(200,175,255,0.72)', fontFamily: 'Outfit_700Bold', letterSpacing: 3, textTransform: 'uppercase' }}>
                          AI · Game Host
                        </Text>
                      </View>

                      {/* Avatar medallion */}
                      <View style={{ alignItems: 'center', paddingTop: 22, paddingBottom: 18 }}>
                        {/* Shadow halo */}
                        <View style={{
                          width: 84, height: 84, borderRadius: 42,
                          shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.75, shadowRadius: 16, elevation: 10,
                        }}>
                          <View style={{
                            width: 84, height: 84, borderRadius: 42,
                            borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.50)',
                            overflow: 'hidden',
                          }}>
                            <LinearGradient
                              colors={['rgba(124,58,237,0.55)', 'rgba(30,14,70,0.90)']}
                              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                              style={StyleSheet.absoluteFillObject}
                            />
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                              <MascotIcon size={74} uid="host" />
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Copy */}
                      <View style={{ paddingHorizontal: 22, paddingBottom: 22, alignItems: 'center' }}>
                        <Text style={{
                          fontFamily: 'Cinzel_700Bold', fontSize: 18, color: '#fff',
                          letterSpacing: 0.8, textAlign: 'center', lineHeight: 27,
                          textShadowColor: 'rgba(124,58,237,0.65)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
                          marginBottom: 10,
                        }}>
                          I've locked a secret in my mind.
                        </Text>
                        <Text style={{ fontSize: 14, color: 'rgba(185,165,230,0.90)', fontFamily: 'Outfit_400Regular', textAlign: 'center', lineHeight: 22 }}>
                          Ask yes/no questions to close in on it.
                        </Text>

                        {/* Separator */}
                        <LinearGradient
                          colors={['transparent', 'rgba(167,139,250,0.42)', 'transparent']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={{ width: '100%', height: 1, marginVertical: 18 }}
                        />

                        {/* Category + question budget row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12 }}>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={{ fontSize: 24 }}>{soloChallenge.categoryIcon}</Text>
                            <View>
                              <Text style={{ fontSize: 10, color: 'rgba(200,175,255,0.65)', fontFamily: 'Outfit_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Target</Text>
                              <Text style={{ fontSize: 15, color: '#fff', fontFamily: 'Outfit_600SemiBold', marginTop: 1 }}>{soloChallenge.categoryLabel}</Text>
                            </View>
                          </View>
                          {/* Question budget chip */}
                          <View style={{
                            backgroundColor: 'rgba(212,168,74,0.10)',
                            borderWidth: 1, borderColor: 'rgba(212,168,74,0.38)',
                            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
                            alignItems: 'center',
                          }}>
                            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 17, color: C.gold, lineHeight: 20 }}>20</Text>
                            <Text style={{ fontSize: 9, color: 'rgba(212,168,74,0.65)', fontFamily: 'Outfit_700Bold', letterSpacing: 1.5 }}>ASKS</Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  </LinearGradient>
                </View>
              </View>
            )}

            {/* Q&A entries */}
            {soloQuestions.map((q, idx) => {
              if (q.type === 'hint') {
                return <HintCard key={q.id} hintNum={q.hintNum} text={q.text} total={soloTier === 'junior' ? 3 : 2} />;
              }
              const qNum = soloQuestions.slice(0, idx + 1).filter(x => !x.type).length;
              return <QACard key={q.id} num={qNum} text={q.text} answer={q.answer} accent="violet" />;
            })}

            {limitReached && (
              <View style={{ backgroundColor: 'rgba(248,81,73,0.08)', borderWidth: 1, borderColor: 'rgba(248,81,73,0.3)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <Text style={{ color: C.danger, fontFamily: 'Outfit_600SemiBold', fontSize: 14, textAlign: 'center' }}>20 questions used — time to make your guess!</Text>
              </View>
            )}

            {/* Question composer — clearly delineated input zone */}
            {!limitReached && (
              <View style={{ marginTop: 20 }}>
                {/* Eyebrow label with dividers, so the input never gets lost in the feed */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(167,139,250,0.22)' }} />
                  <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.violet2 }}>Ask a yes / no question</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(167,139,250,0.22)' }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <GlassInput
                    accent={C.violet}
                    containerStyle={{ flex: 1 }}
                    style={{ fontSize: 16, paddingVertical: 17 }}
                    placeholder={canAsk ? 'e.g. Is it a person?' : soloLoading ? 'Waiting for AI…' : 'Wait for the answer…'}
                    placeholderTextColor={C.dim}
                    value={soloInput} onChangeText={setSoloInput}
                    editable={canAsk} returnKeyType="send"
                    onSubmitEditing={() => askSoloQuestion(soloInput)}
                  />
                  <PremiumButton
                    square
                    icon={<SendGlyph size={20} />}
                    onPress={() => askSoloQuestion(soloInput)}
                    disabled={!canAsk || !soloInput.trim()}
                  />
                </View>
              </View>
            )}

            {/* Hint button — below input */}
            {soloHintsUsed < (soloTier === 'junior' ? 3 : 2) && (
              <HintButton
                nextHint={soloHintsUsed + 1}
                total={soloTier === 'junior' ? 3 : 2}
                free={soloTier === 'junior'}
                onPress={soloTier === 'junior' ? useSoloHint : () => openAdForHint('solo')}
              />
            )}
          </ScrollView>

          {/* Solve button — fixed at very bottom, bold gold */}
          <View style={{ backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border2, padding: 14, paddingBottom: insets.bottom + 14 }}>
            <SolveButton onPress={() => { setSoloSolveInput(''); setSoloSolveOpen(true); }} />
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── SOLO RESULT ──────────────────────────────────────────────────────────
  if (screen === 'solo_result' && soloResult && soloChallenge) {
    const { solved, questionsUsed } = soloResult;
    return (
      <View style={[S.flex, { backgroundColor: '#05050f' }]}>
      <PremiumBackground />
      <ScrollView style={S.flex} contentContainerStyle={[S.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
        <View style={S.screenHeader}>
          <TouchableOpacity onPress={() => setScreen('modes')}><Text style={S.backBtn}>← Modes</Text></TouchableOpacity>
        </View>

        {/* Result hero */}
        <View style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Text style={{ fontSize: 56, marginBottom: 10 }}>{solved ? '🎉' : '😔'}</Text>
          <Text style={[S.tH1, { color: solved ? C.gold : C.muted, letterSpacing: 2 }]}>
            {solved ? 'You Cracked It!' : 'Not This Time'}
          </Text>
          <Text style={[S.tBodySm, { color: C.muted, marginTop: 8 }]}>
            {solved ? `Solved in ${questionsUsed} question${questionsUsed !== 1 ? 's' : ''}` : `Used all ${questionsUsed} questions`}
          </Text>
        </View>

        {/* Secret reveal */}
        <View style={{ backgroundColor: 'rgba(109,40,217,0.08)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16 }}>
          <Text style={[S.tLabel, { color: C.dim, letterSpacing: 3, marginBottom: 8 }]}>The Secret Was</Text>
          <Text style={[S.tH1, { color: C.violet2, textAlign: 'center' }]}>{soloChallenge.secret}</Text>
          <Text style={[S.tCaption, { color: C.muted, marginTop: 6 }]}>{soloChallenge.categoryIcon} {soloChallenge.categoryLabel}</Text>
        </View>

        {/* Educational data card */}
        {(soloChallenge.facts || []).length > 0 && (
          <View style={[S.infoCard, { marginBottom: 24 }]}>
            <Text style={[S.tOverline, { letterSpacing: 3, marginBottom: 14 }]}>📖 About This Secret</Text>
            {/* Info card row — rendered for all categories that have infoFields */}
            {(soloChallenge.infoFields || []).length > 0 && (
              <View style={{ backgroundColor: 'rgba(212,168,74,0.08)', borderWidth: 1, borderColor: 'rgba(212,168,74,0.25)', borderRadius: 10, padding: 12, marginBottom: 16, gap: 6 }}>
                {soloChallenge.infoFields.map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13 }}>{f.icon}</Text>
                    <Text style={[S.tBodySm, { color: C.gold, fontFamily: 'Outfit_600SemiBold' }]}>{f.label}: </Text>
                    <Text style={[S.tBodySm, { color: C.text, flex: 1 }]}>{f.value}</Text>
                  </View>
                ))}
              </View>
            )}
            {(soloChallenge.facts || []).map((fact, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottomWidth: i < soloChallenge.facts.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(109,40,217,0.18)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Text style={{ fontSize: 11, color: C.violet2, fontFamily: 'Outfit_700Bold' }}>{i + 1}</Text>
                </View>
                <Text style={[S.tBodySm, { flex: 1, color: C.text, lineHeight: 20 }]}>{fact}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={S.btnGold} onPress={startSoloChallenge}>
          <Text style={S.btnGoldText}>Play Again →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.btnOutline, { marginTop: 10 }]} onPress={() => setScreen('solo_setup')}>
          <Text style={S.btnOutlineText}>Change Category</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 10, alignItems: 'center', padding: 10 }} onPress={() => setScreen('modes')}>
          <Text style={[S.tBodySm, { color: C.dim }]}>← Back to Modes</Text>
        </TouchableOpacity>
      </ScrollView>
      </View>
    );
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────
  if (screen === 'create') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: '#05050f' }]}>
        <PremiumBackground />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('multi_home')}>
              <Text style={S.backBtn}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={S.h2}>Create Game</Text>
          <Text style={[S.muted, { marginBottom: 28 }]}>Choose a room type — you'll be the first host this round.</Text>

          {/* Private — big gold box */}
          <TouchableOpacity onPress={() => createGame(false)} activeOpacity={0.85} style={{ marginBottom: 16 }}>
            <View style={{ borderRadius: 20, shadowColor: C.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10 }}>
              <LinearGradient colors={['rgba(255,236,170,0.90)', 'rgba(212,168,74,0.50)', 'rgba(150,98,22,0.68)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 3 }}>
                <LinearGradient colors={['rgba(212,168,74,0.22)', 'rgba(120,80,15,0.14)', 'rgba(50,30,5,0.28)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 17.5, overflow: 'hidden', padding: 22 }}>
                  <LinearGradient colors={['rgba(255,232,160,0.26)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56 }} />
                  <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 16.5, borderWidth: 1, borderColor: 'rgba(255,232,160,0.18)' }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(212,168,74,0.16)', borderWidth: 1.5, borderColor: 'rgba(255,220,140,0.45)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 30 }}>🔒</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.serifBold, fontSize: 20, color: C.gold, letterSpacing: 0.5, marginBottom: 4 }}>Private Room</Text>
                      <Text style={{ fontFamily: F.sans, fontSize: 14, color: 'rgba(255,220,140,0.78)', lineHeight: 19 }}>Share a code or QR with friends. Only they can join.</Text>
                    </View>
                    <Text style={{ color: C.gold, fontSize: 24 }}>›</Text>
                  </View>
                </LinearGradient>
              </LinearGradient>
            </View>
          </TouchableOpacity>

          {/* Public — big violet box */}
          <TouchableOpacity onPress={() => createGame(true)} activeOpacity={0.85}>
            <View style={{ borderRadius: 20, shadowColor: C.violet, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.40, shadowRadius: 16, elevation: 10 }}>
              <LinearGradient colors={['rgba(190,155,255,0.90)', 'rgba(124,58,237,0.50)', 'rgba(76,24,170,0.68)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 3 }}>
                <LinearGradient colors={['rgba(124,58,237,0.22)', 'rgba(80,30,180,0.14)', 'rgba(40,10,90,0.28)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 17.5, overflow: 'hidden', padding: 22 }}>
                  <LinearGradient colors={['rgba(200,160,255,0.24)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56 }} />
                  <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 16.5, borderWidth: 1, borderColor: 'rgba(180,140,255,0.17)' }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(124,58,237,0.20)', borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.42)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 30 }}>🌐</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.serifBold, fontSize: 20, color: C.violet2, letterSpacing: 0.5, marginBottom: 4 }}>Public Room</Text>
                      <Text style={{ fontFamily: F.sans, fontSize: 14, color: C.muted, lineHeight: 19 }}>Open to anyone. Great for meeting new players!</Text>
                    </View>
                    <Text style={{ color: C.violet2, fontSize: 24 }}>›</Text>
                  </View>
                </LinearGradient>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── JOIN ─────────────────────────────────────────────────────────────────
  if (screen === 'join') {
    const joinReady = codeInput.length === 6 && nameInput.trim();
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: '#05050f' }]}>
        <PremiumBackground />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('multi_home')}>
              <Text style={S.backBtn}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={S.h2}>Join Game</Text>
          <Text style={[S.muted, { marginBottom: 24 }]}>Enter the room code your host shared with you.</Text>
          <Text style={S.fieldLabel}>Room Code</Text>
          <GlassInput
            containerStyle={{ marginBottom: 20 }}
            style={{ textAlign: 'center', fontFamily: 'Cinzel_700Bold', fontSize: 28, letterSpacing: 8, color: C.gold }}
            placeholder="XXXXXX" placeholderTextColor={C.dim}
            value={codeInput} onChangeText={(t) => setCodeInput(t.toUpperCase())}
            maxLength={6} autoCapitalize="characters" autoFocus
            onSubmitEditing={joinGame} returnKeyType="go"
          />

          {/* Joining as — read-only identity (set on the home screen) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.border2, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 }}>
            <PlayerAvatar p={{ avatarIdx: selectedAvatarIdx }} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>Joining as</Text>
              <Text style={{ fontFamily: F.sansSemi, fontSize: 16, color: C.text }}>{nameInput.trim() || 'Player'}</Text>
            </View>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: 13, color: C.gold }}>Edit</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[S.btnGold, !joinReady && S.btnDisabled]} onPress={joinGame} disabled={!joinReady}>
            <Text style={S.btnGoldText}>Join →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (screen === 'rooms') {
    const readyToJoin = !!nameInput.trim();
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: '#05050f' }]}>
        <PremiumBackground />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('modes')}>
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
          <GlassInput
            containerStyle={{ marginBottom: 8 }}
            placeholder="Enter your name..." placeholderTextColor={C.dim}
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
              <TouchableOpacity style={S.btnOutlineSm} onPress={() => createGame(true)}>
                <Text style={S.btnOutlineSmText}>+ Create Public Room</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[S.fieldLabel, { marginTop: 4 }]}>{publicRooms.length} open room{publicRooms.length !== 1 ? 's' : ''}</Text>
              {publicRooms.map((r) => {
                const a = av(r.hostAvatarIdx);
                const full = r.playerCount >= 5;
                return (
                  <TouchableOpacity
                    key={r.roomCode}
                    activeOpacity={0.82}
                    style={{ marginBottom: 10, opacity: full ? 0.5 : 1 }}
                    onPress={() => !full && readyToJoin && joinPublicRoom(r.roomCode)}
                    disabled={full || !readyToJoin}
                  >
                    <View style={{ borderRadius: 16, shadowColor: C.violet, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 6 }}>
                      <LinearGradient colors={['rgba(130,100,200,0.45)', 'rgba(60,30,130,0.22)', 'rgba(28,14,80,0.35)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 1 }}>
                        <View style={{ borderRadius: 15, backgroundColor: 'rgba(22,22,52,0.88)', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.30)' }}>
                            <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: F.sansBold, fontSize: 15, color: C.text }}>{r.hostName}'s room</Text>
                            <Text style={{ fontSize: 11, color: C.dim, fontFamily: F.sans, marginTop: 2 }}>
                              Code {r.roomCode} · {r.playerCount} player{r.playerCount !== 1 ? 's' : ''} waiting
                            </Text>
                          </View>
                          {full ? (
                            <View style={S.badgeGuesser}>
                              <Text style={S.badgeGuesserText}>Full</Text>
                            </View>
                          ) : (
                            <Text style={{ color: C.violet2, fontSize: 22 }}>›</Text>
                          )}
                        </View>
                      </LinearGradient>
                    </View>
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

  if (!game) return null;

  // ─── LOBBY ────────────────────────────────────────────────────────────────
  if (screen === 'lobby') {
    return (
      <View style={[S.flex, { backgroundColor: '#05050f' }]}>
      <PremiumBackground />
        <SBar />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 90 }]}>
          <View style={S.screenHeader}>
            <Chip label="Lobby" />
            <Text style={[S.tCaption, { color: C.dim }]}>
              {game.players.length} player{game.players.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Room code + QR */}
          {game.isPublic ? (
            <View style={{ borderRadius: 20, shadowColor: C.violet, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 18, elevation: 10, marginVertical: 14 }}>
              <LinearGradient colors={['rgba(180,140,255,0.62)', 'rgba(124,58,237,0.26)', 'rgba(70,20,160,0.42)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 1.5 }}>
                <LinearGradient colors={['rgba(124,58,237,0.20)', 'rgba(80,30,180,0.13)', 'rgba(40,10,90,0.26)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 18.5, overflow: 'hidden', padding: 22, alignItems: 'center' }}>
                  <LinearGradient colors={['rgba(200,160,255,0.22)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56 }} />
                  <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 17.5, borderWidth: 1, borderColor: 'rgba(180,140,255,0.13)' }} />
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(124,58,237,0.20)', borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.40)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 26 }}>🌐</Text>
                  </View>
                  <Text style={{ fontFamily: F.serifBold, fontSize: 17, color: C.violet2, marginBottom: 6, letterSpacing: 0.3 }}>Room is Public</Text>
                  <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
                    Your room is listed in the public browser.{'\n'}Anyone can find and join while you wait here.
                  </Text>
                  <View style={{ height: 1, backgroundColor: 'rgba(167,139,250,0.20)', width: '100%', marginBottom: 16 }} />
                  <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, fontFamily: F.sansBold }}>Or share directly</Text>
                  <Text style={{ fontFamily: F.serifBlack, fontSize: 32, color: C.gold, letterSpacing: 8, marginBottom: 4, textShadowColor: 'rgba(212,168,74,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }}>{game.roomCode}</Text>
                  <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 10 }}>
                    <QRCode
                      value={joinLink || `enigma://join?code=${game.roomCode}`}
                      size={110} backgroundColor="#ffffff" color="#06060f"
                    />
                  </View>
                </LinearGradient>
              </LinearGradient>
            </View>
          ) : (
            <View style={{ borderRadius: 22, shadowColor: C.gold, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.38, shadowRadius: 22, elevation: 12, marginVertical: 14 }}>
              <LinearGradient colors={['rgba(255,232,160,0.72)', 'rgba(212,168,74,0.30)', 'rgba(140,90,18,0.50)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 1.5 }}>
                <LinearGradient colors={['rgba(212,168,74,0.24)', 'rgba(120,80,15,0.14)', 'rgba(50,30,5,0.28)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 20.5, overflow: 'hidden', padding: 24, alignItems: 'center' }}>
                  <LinearGradient colors={['rgba(255,232,160,0.28)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60 }} />
                  <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 19.5, borderWidth: 1, borderColor: 'rgba(255,232,160,0.16)' }} />
                  <Text style={{ fontSize: 10, color: 'rgba(255,220,140,0.65)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10, fontFamily: F.sansBold }}>Room Code</Text>
                  <Text style={{ fontFamily: F.serifBlack, fontSize: 40, color: C.gold, letterSpacing: 10, textShadowColor: 'rgba(212,168,74,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>{game.roomCode}</Text>
                  <Text style={{ fontFamily: F.sans, fontSize: 12, color: 'rgba(255,220,140,0.55)', marginTop: 8, marginBottom: 18 }}>Share this code or scan QR to join</Text>
                  <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 12 }}>
                    <QRCode
                      value={joinLink || `enigma://join?code=${game.roomCode}`}
                      size={140} backgroundColor="#ffffff" color="#06060f"
                    />
                  </View>
                </LinearGradient>
              </LinearGradient>
            </View>
          )}

          {/* Players */}
          <View style={{ borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6, marginBottom: 12 }}>
            <LinearGradient colors={['rgba(80,60,160,0.55)', 'rgba(30,20,80,0.30)', 'rgba(16,10,50,0.45)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: 1 }}>
              <View style={{ borderRadius: 17, backgroundColor: 'rgba(22,22,52,0.92)', padding: 16 }}>
                <Text style={[S.cardTitle, { marginBottom: 12 }]}>Players in Room</Text>
                {game.players.map((p) => (
                  <View key={p.id} style={[S.playerItem, { backgroundColor: 'rgba(28,28,62,0.70)', borderColor: C.border2 }]}>
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
            </LinearGradient>
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
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <LinearGradient colors={['transparent', 'rgba(6,6,15,0.92)', '#06060f']} style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
              {game.players.length >= 2
                ? <SolveButton label="Start Game →" onPress={startGame} />
                : <View style={{ alignItems: 'center', paddingVertical: 14, backgroundColor: 'rgba(28,28,62,0.60)', borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
                    <Text style={[S.muted, { textAlign: 'center' }]}>Need at least 2 players to start</Text>
                  </View>
              }
            </LinearGradient>
          </View>
        )}
      </View>
    );
  }

  // ─── THEME SELECT ─────────────────────────────────────────────────────────
  if (screen === 'theme') {
    return (
      <View style={[S.flex, { backgroundColor: '#05050f' }]}>
      <PremiumBackground />
        <SBar />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <Chip label={`Round ${game.round}`} />
            <Text style={[S.tCaption, { color: C.muted }]}>Host: {host?.name}</Text>
          </View>

          {viewerIsHost ? (
            <>
              <Text style={[S.h2, { letterSpacing: 0.5 }]}>Choose a Theme</Text>
              <Text style={[S.muted, { marginBottom: 20 }]}>Your secret must fit within this category.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                {THEMES.map((t) => {
                  const sel = selectedTheme?.id === t.id;
                  return (
                    <TouchableOpacity key={t.id} onPress={() => setSelectedTheme(t)} activeOpacity={0.85} style={{ width: '47%' }}>
                      {sel ? (
                        <View style={{ borderRadius: 16, shadowColor: C.violet, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.42, shadowRadius: 14, elevation: 9 }}>
                          <LinearGradient colors={['rgba(190,155,255,0.92)', 'rgba(124,58,237,0.52)', 'rgba(76,24,170,0.70)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 2 }}>
                            <LinearGradient colors={['rgba(124,58,237,0.26)', 'rgba(80,30,180,0.16)', 'rgba(40,10,90,0.30)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 14, overflow: 'hidden', padding: 15, minHeight: 132 }}>
                              <LinearGradient colors={['rgba(200,160,255,0.26)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 42 }} />
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</Text>
                                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.violet2, alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ fontSize: 11, color: '#1a0830', fontFamily: F.sansBold }}>✓</Text>
                                </View>
                              </View>
                              <Text style={{ fontFamily: F.serifBold, fontSize: 14, color: C.violet2, marginBottom: 4, letterSpacing: 0.3 }}>{t.label}</Text>
                              <Text style={{ fontFamily: F.sans, fontSize: 11, color: 'rgba(200,180,255,0.78)', lineHeight: 15 }}>{t.desc}</Text>
                            </LinearGradient>
                          </LinearGradient>
                        </View>
                      ) : (
                        <View style={{ borderRadius: 16, borderWidth: 1.5, borderColor: C.border2, backgroundColor: C.card, padding: 17, minHeight: 132 }}>
                          <Text style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</Text>
                          <Text style={{ fontFamily: F.serifBold, fontSize: 14, color: C.text, marginBottom: 4, letterSpacing: 0.3 }}>{t.label}</Text>
                          <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.muted, lineHeight: 15 }}>{t.desc}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={[S.btnGold, !selectedTheme && S.btnDisabled]} onPress={confirmTheme} disabled={!selectedTheme}>
                <Text style={S.btnGoldText}>Continue →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 48 }}>
              <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(124,58,237,0.14)', borderWidth: 2, borderColor: 'rgba(167,139,250,0.40)', alignItems: 'center', justifyContent: 'center', marginBottom: 22, shadowColor: C.violet, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.40, shadowRadius: 18, elevation: 10 }}>
                <Text style={{ fontSize: 46 }}>⏳</Text>
              </View>
              <Text style={[S.h2, { textAlign: 'center', marginBottom: 8 }]}>Host is choosing…</Text>
              <Text style={[S.muted, { textAlign: 'center', marginBottom: 28, maxWidth: 260 }]}>The host is selecting a theme. Prepare your mind.</Text>

              {/* Host card — violet glass */}
              <View style={{ borderRadius: 18, shadowColor: C.violet, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 14, elevation: 8, alignSelf: 'stretch', marginHorizontal: 8 }}>
                <LinearGradient colors={['rgba(180,140,255,0.58)', 'rgba(124,58,237,0.22)', 'rgba(70,20,160,0.40)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: 1.5 }}>
                  <LinearGradient colors={['rgba(124,58,237,0.18)', 'rgba(70,25,150,0.12)', 'rgba(30,8,80,0.24)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 16.5, overflow: 'hidden', paddingVertical: 18, paddingHorizontal: 28, alignItems: 'center' }}>
                    <LinearGradient colors={['rgba(180,140,255,0.20)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44 }} />
                    <Text style={{ fontSize: 10, color: C.violet2, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 6, fontFamily: F.sansBold }}>Host This Round</Text>
                    <Text style={{ fontFamily: F.serifBold, fontSize: 22, color: C.text, letterSpacing: 0.3 }}>{host?.name}</Text>
                  </LinearGradient>
                </LinearGradient>
              </View>

              <Text style={{ fontSize: 11, color: C.dim, marginTop: 20, fontFamily: 'Outfit_400Regular', textAlign: 'center' }}>
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: '#05050f' }]}>
        <PremiumBackground />
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
                    <Text style={[S.tBodySm, { flex: 1, color: C.muted, lineHeight: 20 }]}>{f}</Text>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={S.btnGold}
                onPress={() => { const item = libraryBriefing; setLibraryBriefing(null); lockSecret(item.secret, ''); }}
              >
                <Text style={S.btnGoldText}>I'm Ready — Start Round →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 10, alignItems: 'center', padding: 8 }} onPress={() => setLibraryBriefing(null)}>
                <Text style={[S.tBodySm, { color: C.dim }]}>← Choose a different secret</Text>
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
              <Text style={[S.h2, { letterSpacing: 0.5 }]}>Choose Your Secret</Text>
              <Text style={[S.muted, { marginBottom: 18 }]}>Guessers will try to unravel it in 20 questions.</Text>

              {/* Source tabs — segmented glass */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[
                  { id: 'library', label: '📚 From Library' },
                  { id: 'manual', label: '✏️ Write My Own' },
                ].map((tab) => {
                  const on = secretSource === tab.id;
                  return (
                    <TouchableOpacity key={tab.id} style={{ flex: 1 }} activeOpacity={0.85} onPress={() => setSecretSource(tab.id)}>
                      {on ? (
                        <LinearGradient colors={['rgba(255,232,160,0.55)', 'rgba(212,168,74,0.22)', 'rgba(140,90,18,0.40)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 12, padding: 1.2 }}>
                          <View style={{ borderRadius: 11, backgroundColor: 'rgba(212,168,74,0.14)', paddingVertical: 12, alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontFamily: F.sansBold, color: C.gold }}>{tab.label}</Text>
                          </View>
                        </LinearGradient>
                      ) : (
                        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: C.border2, backgroundColor: C.card, paddingVertical: 13, alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, fontFamily: F.sansSemi, color: C.muted }}>{tab.label}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {secretSource === 'library' ? (
                <>
                  <Text style={[S.muted, { marginBottom: 14 }]}>Pick a secret — you'll get private facts to help you answer questions confidently.</Text>
                  {themeLibrary.map((item, i) => (
                    <TouchableOpacity key={i} activeOpacity={0.85} onPress={() => setLibraryBriefing(item)} style={{ marginBottom: 11 }}>
                      <View style={{ borderRadius: 16, shadowColor: C.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 5 }}>
                        <LinearGradient colors={['rgba(255,232,160,0.40)', 'rgba(212,168,74,0.16)', 'rgba(140,90,18,0.28)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 1.2 }}>
                          <LinearGradient colors={['rgba(212,168,74,0.13)', 'rgba(60,40,10,0.10)', 'rgba(30,20,5,0.20)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 14.8, overflow: 'hidden', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <LinearGradient colors={['rgba(255,232,160,0.16)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 36 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontFamily: F.serifBold, fontSize: 15, color: C.text, marginBottom: 3, letterSpacing: 0.3 }}>{item.secret}</Text>
                              <Text style={[S.tCaption, { color: 'rgba(255,220,140,0.70)' }]}>{item.hint}</Text>
                            </View>
                            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(212,168,74,0.16)', borderWidth: 1, borderColor: 'rgba(255,220,140,0.40)', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: C.gold, fontSize: 18 }}>›</Text>
                            </View>
                          </LinearGradient>
                        </LinearGradient>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <>
                  <Text style={[S.muted, { marginBottom: 18 }]}>Think of something within the theme. Guessers must unravel it.</Text>
                  <Text style={S.fieldLabel}>Secret Answer</Text>
                  <GlassInput
                    containerStyle={{ marginBottom: 8 }}
                    placeholder={`e.g. "Nikola Tesla", "The Magna Carta"...`}
                    placeholderTextColor={C.dim}
                    value={secretInput} onChangeText={setSecretInput} autoFocus
                  />
                  <View style={{ backgroundColor: 'rgba(245,158,11,0.07)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 10, padding: 12, marginVertical: 10 }}>
                    <Text style={[S.tCaption, { color: C.warn }]}>🔒 Your answer is hidden until the round ends.</Text>
                  </View>
                  <TouchableOpacity style={[S.btnGold, !secretInput.trim() && S.btnDisabled]} onPress={() => lockSecret()} disabled={!secretInput.trim()}>
                    <Text style={S.btnGoldText}>Lock it in → Start Round</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 56 }}>
              <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(124,58,237,0.14)', borderWidth: 2, borderColor: 'rgba(167,139,250,0.40)', alignItems: 'center', justifyContent: 'center', marginBottom: 22, shadowColor: C.violet, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.40, shadowRadius: 18, elevation: 10 }}>
                <Text style={{ fontSize: 46 }}>🤫</Text>
              </View>
              <Text style={[S.h2, { textAlign: 'center', marginBottom: 8 }]}>Host is choosing their secret…</Text>
              <Text style={[S.muted, { textAlign: 'center', maxWidth: 260, marginBottom: 28 }]}>Stay sharp. The questioning begins soon.</Text>

              {/* Host card — violet glass */}
              <View style={{ borderRadius: 18, shadowColor: C.violet, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 14, elevation: 8, alignSelf: 'stretch', marginHorizontal: 8 }}>
                <LinearGradient colors={['rgba(180,140,255,0.58)', 'rgba(124,58,237,0.22)', 'rgba(70,20,160,0.40)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: 1.5 }}>
                  <LinearGradient colors={['rgba(124,58,237,0.18)', 'rgba(70,25,150,0.12)', 'rgba(30,8,80,0.24)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 16.5, overflow: 'hidden', paddingVertical: 18, paddingHorizontal: 28, alignItems: 'center' }}>
                    <LinearGradient colors={['rgba(180,140,255,0.20)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44 }} />
                    <Text style={{ fontSize: 10, color: C.violet2, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 6, fontFamily: F.sansBold }}>Host This Round</Text>
                    <Text style={{ fontFamily: F.serifBold, fontSize: 22, color: C.text, letterSpacing: 0.3 }}>{host?.name}</Text>
                  </LinearGradient>
                </LinearGradient>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── GAME ─────────────────────────────────────────────────────────────────
  if (screen === 'game') {
    const qLeft = 20 - answeredQs;
    const canAsk = !viewerIsHost && isMyTurn && !pendingQ;

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: '#05050f' }]}>
        <PremiumBackground />
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
            <View style={{ width: '100%', borderRadius: 22, shadowColor: C.danger, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 22, elevation: 14 }}>
              <LinearGradient colors={['rgba(255,120,110,0.85)', 'rgba(248,81,73,0.40)', 'rgba(150,30,25,0.60)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 2 }}>
                <LinearGradient colors={['rgba(248,81,73,0.16)', 'rgba(40,8,8,0.40)', 'rgba(15,15,40,0.55)']} locations={[0, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 20, overflow: 'hidden', padding: 24 }}>
                  <LinearGradient colors={['rgba(255,120,110,0.18)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60 }} />
                  <Text style={{ fontFamily: F.serifBold, fontSize: 20, color: C.danger, textAlign: 'center', marginBottom: 4, letterSpacing: 0.3 }}>⏰ Answer Now!</Text>
                  <Text style={[S.tCaption, { color: C.muted, textAlign: 'center', marginBottom: 16 }]}>
                    {(game?.hostConsecutiveMisses || 0) === 0
                      ? 'Miss 1 of 2 — answer or the question will be skipped'
                      : '⚠️ Miss 2 of 2 — answer or you will be eliminated as host!'}
                  </Text>
                  <View style={{ alignItems: 'center', marginBottom: 14 }}>
                    <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 46, color: hostWarningSecsLeft <= 4 ? C.danger : C.warn }}>{hostWarningSecsLeft}</Text>
                    <View style={{ height: 5, width: '100%', backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                      <Animated.View style={{ height: 5, width: hostWarnBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: hostWarningSecsLeft <= 4 ? C.danger : C.warn, borderRadius: 3 }} />
                    </View>
                  </View>
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.30)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 13, marginBottom: 16 }}>
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
                </LinearGradient>
              </LinearGradient>
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
              {/* Their guess — gold glass */}
              <View style={{ borderRadius: 14, marginBottom: 12, shadowColor: C.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5 }}>
                <LinearGradient colors={['rgba(255,232,160,0.50)', 'rgba(212,168,74,0.18)', 'rgba(140,90,18,0.34)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 14, padding: 1.5 }}>
                  <LinearGradient colors={['rgba(212,168,74,0.14)', 'rgba(60,40,10,0.10)', 'rgba(30,20,5,0.20)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 12.5, overflow: 'hidden', padding: 16, alignItems: 'center' }}>
                    <LinearGradient colors={['rgba(255,232,160,0.16)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 36 }} />
                    <Text style={{ fontSize: 10, color: 'rgba(255,220,140,0.70)', letterSpacing: 2, marginBottom: 4, fontFamily: F.sansBold }}>THEIR GUESS</Text>
                    <Text style={{ fontFamily: F.serifBold, fontSize: 22, color: C.gold, letterSpacing: 0.3 }}>{game.pendingSolve?.answer}</Text>
                    {game.pendingSolve && (() => {
                      const looks = fuzzyMatch(game.pendingSolve.answer, game.secretAnswer);
                      return (
                        <View style={{ marginTop: 8, backgroundColor: looks ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, color: looks ? C.success : C.danger, fontFamily: 'Outfit_500Medium' }}>
                            {looks ? '🤖 Looks correct' : '🤖 Looks wrong'} — but you decide!
                          </Text>
                        </View>
                      );
                    })()}
                  </LinearGradient>
                </LinearGradient>
              </View>
              {/* Actual secret — violet glass */}
              <View style={{ borderRadius: 14, marginBottom: 16, shadowColor: C.violet, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.24, shadowRadius: 10, elevation: 5 }}>
                <LinearGradient colors={['rgba(180,140,255,0.52)', 'rgba(124,58,237,0.20)', 'rgba(70,20,160,0.36)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 14, padding: 1.5 }}>
                  <LinearGradient colors={['rgba(124,58,237,0.16)', 'rgba(70,25,150,0.10)', 'rgba(30,8,80,0.22)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 12.5, overflow: 'hidden', padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: C.violet2, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4, fontFamily: F.sansBold }}>Actual Secret</Text>
                    <Text style={{ fontFamily: F.serifBold, fontSize: 20, color: C.text, letterSpacing: 0.3 }}>{game.secretAnswer}</Text>
                  </LinearGradient>
                </LinearGradient>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[S.btnNo, { flex: 1 }]} onPress={() => hostVerify(false)}>
                  <Text style={{ color: C.danger, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>✗ Wrong  −5 pts</Text>
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
                <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: 'rgba(124,58,237,0.14)', borderWidth: 2, borderColor: 'rgba(167,139,250,0.40)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: C.violet, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.40, shadowRadius: 16, elevation: 10 }}>
                  <Text style={{ fontSize: 42 }}>⚖️</Text>
                </View>
                <Text style={S.modalTitle}>Host is deciding…</Text>
                <Text style={S.modalSub}>{game.pendingSolve?.playerName} submitted an answer — waiting for the verdict.</Text>
                {/* Submitted answer — gold glass */}
                <View style={{ alignSelf: 'stretch', borderRadius: 14, marginBottom: 16, shadowColor: C.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.20, shadowRadius: 10, elevation: 5 }}>
                  <LinearGradient colors={['rgba(255,232,160,0.48)', 'rgba(212,168,74,0.18)', 'rgba(140,90,18,0.34)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 14, padding: 1.5 }}>
                    <LinearGradient colors={['rgba(212,168,74,0.14)', 'rgba(60,40,10,0.10)', 'rgba(30,20,5,0.20)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 12.5, overflow: 'hidden', padding: 16, alignItems: 'center' }}>
                      <LinearGradient colors={['rgba(255,232,160,0.16)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 36 }} />
                      <Text style={{ fontSize: 10, color: 'rgba(255,220,140,0.70)', letterSpacing: 2, marginBottom: 6, fontFamily: F.sansBold }}>ANSWER SUBMITTED</Text>
                      <Text style={{ fontFamily: F.serifBold, fontSize: 22, color: C.gold, letterSpacing: 0.3 }}>{game.pendingSolve?.answer}</Text>
                    </LinearGradient>
                  </LinearGradient>
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
              <View style={{ alignItems: 'center', marginBottom: 14 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(124,58,237,0.14)', borderWidth: 2, borderColor: 'rgba(167,139,250,0.40)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: C.violet, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.36, shadowRadius: 14, elevation: 9 }}>
                  <Text style={{ fontSize: 34 }}>💡</Text>
                </View>
                <Text style={[S.modalTitle, { textAlign: 'center' }]}>Make Your Guess</Text>
                <Text style={[S.modalSub, { textAlign: 'center', marginBottom: 0 }]}>Be confident — a wrong guess costs you 5 points!</Text>
              </View>
              <GlassInput
                accent={C.violet}
                containerStyle={{ marginBottom: 12 }}
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
          {/* Category header — violet glass bar with Round chip */}
          <View style={{ paddingTop: 10, paddingBottom: 8 }}>
            <View style={{ borderRadius: 16, shadowColor: C.violet, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.30, shadowRadius: 12, elevation: 7 }}>
              <LinearGradient colors={['rgba(180,140,255,0.55)', 'rgba(124,58,237,0.22)', 'rgba(70,20,160,0.40)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 1.5 }}>
                <LinearGradient colors={['rgba(124,58,237,0.18)', 'rgba(70,25,150,0.12)', 'rgba(30,8,80,0.24)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 14.5, overflow: 'hidden', paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <LinearGradient colors={['rgba(180,140,255,0.18)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 30 }} />
                  <Text style={{ fontSize: 22 }}>{game.theme?.icon}</Text>
                  <Text style={{ fontFamily: F.serifBold, fontSize: 17, color: C.violet2, flex: 1, letterSpacing: 0.3 }} numberOfLines={1}>{game.theme?.label}</Text>
                  <View style={{ backgroundColor: 'rgba(200,168,74,0.16)', borderWidth: 1, borderColor: C.goldDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontFamily: F.serifBold, fontSize: 12, color: C.gold }}>Round {game.round}</Text>
                  </View>
                </LinearGradient>
              </LinearGradient>
            </View>
          </View>

          {/* Progress bar */}
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: C.muted, fontFamily: F.sansSemi, letterSpacing: 0.3 }}>Questions Remaining</Text>
              <Text style={{ fontSize: 13, color: qLeft <= 5 ? C.danger : C.gold, fontFamily: F.sansBold }}>{qLeft} / 20</Text>
            </View>
            <View style={{ height: 5, backgroundColor: C.border2, borderRadius: 3, overflow: 'hidden' }}>
              <LinearGradient
                colors={qLeft <= 5 ? ['#ff7a6e', C.danger] : [C.gold2, C.gold]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ height: 5, width: `${(answeredQs / 20) * 100}%`, borderRadius: 3 }}
              />
            </View>
          </View>

          {/* Player strip */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
            contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2, gap: 8 }}
          >
            {game.players.map((p) => {
              const a = av(p.avatarIdx);
              const isCur = currentQuestioner?.id === p.id && !p.isHost;
              return (
                <View
                  key={p.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    borderRadius: 13, paddingVertical: 6, paddingHorizontal: 10,
                    borderWidth: 1.5,
                    borderColor: isCur ? C.violet2 : C.border2,
                    backgroundColor: isCur ? 'rgba(124,58,237,0.16)' : 'rgba(255,255,255,0.03)',
                    ...(isCur ? { shadowColor: C.violet, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 } : {}),
                  }}
                >
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Text style={{ fontSize: 16 }}>{a.emoji}</Text>
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={{ fontSize: 11, color: isCur ? C.violet2 : C.muted, fontFamily: F.sansSemi, maxWidth: 60 }} numberOfLines={1}>
                      {p.isHost ? '👑 ' : ''}{p.name.split(' ')[0]}
                    </Text>
                    <Text style={{ fontFamily: F.serifBold, fontSize: 12, color: C.gold }}>{p.score} pts</Text>
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

          {/* Host secret reveal — violet glass */}
          {viewerIsHost && (
            <View style={{ borderRadius: 14, marginBottom: 8, shadowColor: C.violet, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.26, shadowRadius: 11, elevation: 6 }}>
              <LinearGradient colors={['rgba(180,140,255,0.50)', 'rgba(124,58,237,0.20)', 'rgba(70,20,160,0.36)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 14, padding: 1.5 }}>
                <LinearGradient colors={['rgba(124,58,237,0.16)', 'rgba(70,25,150,0.10)', 'rgba(30,8,80,0.22)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 12.5, overflow: 'hidden', paddingVertical: 11, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: C.violet2, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3, fontFamily: F.sansBold }}>🔒 Your Secret</Text>
                  <Text style={{ fontFamily: F.serifBold, fontSize: 19, color: C.text, letterSpacing: 0.3 }}>{game.secretAnswer}</Text>
                </LinearGradient>
              </LinearGradient>
            </View>
          )}

          {/* Q Feed */}
          <ScrollView ref={feedScrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {game.questions.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={[S.tBodySm, { color: C.dim, textAlign: 'center', lineHeight: 22 }]}>
                  No questions yet.{'\n'}The first guesser will set the tone...
                </Text>
              </View>
            ) : (
              game.questions.map((q, i) => {
                const a = av(q.askerAvatarIdx);
                return (
                  <View key={q.id} style={{ backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: C.border2, borderLeftWidth: 3, borderLeftColor: 'rgba(167,139,250,0.55)', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 14 }}>{a.emoji}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontFamily: F.sansBold, color: C.text, flex: 1 }}>{q.askerName}</Text>
                      <View style={{ backgroundColor: 'rgba(200,168,74,0.14)', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 12, color: C.gold, fontFamily: F.sansBold }}>Q{i + 1}</Text>
                      </View>
                    </View>
                    <Text style={[S.tBodyLg, { color: C.text, lineHeight: 23 }]}>{q.text}</Text>
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
                <Text style={[S.tCaption, { color: C.muted, marginBottom: 8 }]}>
                  {'Answering: '}<Text style={{ color: C.text, fontFamily: 'Outfit_600SemiBold' }}>"{pendingQ.text}"</Text>
                </Text>
                <View style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 11, color: hostSecsLeft <= 5 ? C.danger : C.warn, fontFamily: 'Outfit_400Regular' }}>⏱ Answer now</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: hostSecsLeft <= 5 ? C.danger : C.warn }}>{hostSecsLeft}s</Text>
                  </View>
                  <View style={{ height: 3, backgroundColor: C.border2, borderRadius: 2 }}>
                    <Animated.View style={{ height: 3, width: hostBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: hostSecsLeft <= 5 ? C.danger : C.warn, borderRadius: 2 }} />
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
                    <GlassInput
                      accent={C.violet}
                      containerStyle={{ flex: 1 }}
                      style={{ paddingVertical: 10, fontSize: 13 }}
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
            ) : !viewerIsHost ? (
              canAsk ? (
                <View>
                  <View style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 11, color: guesserSecsLeft <= 10 ? C.danger : C.gold, fontFamily: 'Outfit_400Regular' }}>⏱ Your turn</Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: guesserSecsLeft <= 10 ? C.danger : C.gold }}>{guesserSecsLeft}s</Text>
                    </View>
                    <View style={{ height: 3, backgroundColor: C.border2, borderRadius: 2 }}>
                      <Animated.View style={{ height: 3, width: guesserBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: guesserSecsLeft <= 10 ? C.danger : C.gold, borderRadius: 2 }} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <GlassInput
                      accent={C.violet}
                      containerStyle={{ flex: 1 }}
                      style={{ paddingVertical: 12, fontSize: 14 }}
                      placeholder="Ask a yes/no question..." placeholderTextColor={C.dim}
                      value={questionInput} onChangeText={setQuestionInput}
                      onSubmitEditing={submitQuestion} returnKeyType="send"
                    />
                    <PremiumButton
                      square
                      icon={<SendGlyph size={19} />}
                      onPress={submitQuestion}
                      disabled={!questionInput.trim()}
                    />
                  </View>
                  <PremiumButton
                    label="💡 I Know It — Solve!"
                    textStyle={{ fontSize: 14 }}
                    onPress={() => { setSolveInput(''); setSolveModalOpen(true); }}
                  />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: 'rgba(124,58,237,0.07)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(124,58,237,0.22)', justifyContent: 'center' }}>
                    <Text style={[S.tCaption, { color: C.muted }]}>
                      {pendingQ ? '⏳ Waiting for host to answer…' : `⏳ Waiting for ${currentQuestioner?.name || 'next player'}…`}
                    </Text>
                  </View>
                  <TouchableOpacity style={[S.btnSolve, { paddingHorizontal: 16 }]} onPress={() => { setSolveInput(''); setSolveModalOpen(true); }}>
                    <Text style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 13 }}>💡 Solve</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View style={{ paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', backgroundColor: 'rgba(124,58,237,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(124,58,237,0.20)' }}>
                <Text style={[S.tCaption, { color: C.muted, textAlign: 'center' }]}>
                  👑 You're the host — watch and answer questions as they come in.
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
      <View style={[S.flex, { backgroundColor: '#05050f' }]}>
      <PremiumBackground />
        <SBar />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 24 }]}>
          {/* Winner block — gold glass */}
          <View style={{ borderRadius: 24, shadowColor: C.gold, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.40, shadowRadius: 24, elevation: 14, marginVertical: 16 }}>
            <LinearGradient colors={['rgba(255,232,160,0.72)', 'rgba(212,168,74,0.30)', 'rgba(140,90,18,0.50)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 1.5 }}>
              <LinearGradient colors={['rgba(212,168,74,0.24)', 'rgba(120,80,15,0.14)', 'rgba(50,30,5,0.28)']} locations={[0, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 22.5, overflow: 'hidden', padding: 28, alignItems: 'center' }}>
                <LinearGradient colors={['rgba(255,232,160,0.28)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 70 }} />
                <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 21.5, borderWidth: 1, borderColor: 'rgba(255,232,160,0.16)' }} />
                <Text style={{ fontSize: 56, marginBottom: 12 }}>{abandoned ? '👻' : hostWon ? '🎩' : '🎉'}</Text>
                <Text style={{ fontFamily: F.serifBlack, fontSize: 26, color: C.gold, textAlign: 'center', letterSpacing: 0.5, textShadowColor: 'rgba(212,168,74,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
                  {abandoned ? `${game.abandonedHostName || 'The host'} left` : hostWon ? host?.name : winner?.name}
                </Text>
                <View style={{ width: 48, height: 1, backgroundColor: 'rgba(212,168,74,0.40)', marginVertical: 12 }} />
                <Text style={{ fontSize: 11, color: 'rgba(255,220,140,0.75)', letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: F.sansBold, textAlign: 'center', lineHeight: 18 }}>
                  {abandoned
                    ? `Round ended — no points awarded.\n${host?.name || 'Next player'} is the new host.`
                    : hostWon
                      ? 'defended the secret — nobody cracked it!'
                      : 'cracked the secret!'}
                </Text>
              </LinearGradient>
            </LinearGradient>
          </View>

          {/* Secret reveal — violet glass */}
          <View style={{ borderRadius: 16, shadowColor: C.violet, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 8, marginBottom: 16 }}>
            <LinearGradient colors={['rgba(180,140,255,0.58)', 'rgba(124,58,237,0.22)', 'rgba(70,20,160,0.38)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 1.5 }}>
              <LinearGradient colors={['rgba(124,58,237,0.18)', 'rgba(70,25,150,0.11)', 'rgba(30,8,80,0.22)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 14.5, overflow: 'hidden', padding: 18, alignItems: 'center' }}>
                <LinearGradient colors={['rgba(180,140,255,0.20)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44 }} />
                <Text style={{ fontSize: 10, color: C.violet2, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6, fontFamily: F.sansBold }}>The Secret Was</Text>
                <Text style={{ fontFamily: F.serifBold, fontSize: 22, color: C.text, textAlign: 'center', letterSpacing: 0.3 }}>{game.secretAnswer}</Text>
                <Text style={{ fontFamily: F.sansMed, fontSize: 12, color: C.dim, marginTop: 6 }}>{game.theme?.icon} {game.theme?.label}</Text>
              </LinearGradient>
            </LinearGradient>
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
      <View style={[S.flex, { backgroundColor: '#05050f' }]}>
      <PremiumBackground />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
          {/* Trophy hero */}
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(212,168,74,0.12)', borderWidth: 2, borderColor: 'rgba(212,168,74,0.40)', alignItems: 'center', justifyContent: 'center', marginBottom: 18, shadowColor: C.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 12 }}>
              <Text style={{ fontSize: 44 }}>🏆</Text>
            </View>
            <Text style={{ fontFamily: F.serifBlack, fontSize: 28, color: C.gold, letterSpacing: 1, textShadowColor: 'rgba(212,168,74,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 }}>Final Standings</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '60%', marginTop: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(212,168,74,0.22)' }} />
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(212,168,74,0.45)', marginHorizontal: 8 }} />
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(212,168,74,0.22)' }} />
            </View>
          </View>

          {/* Leaderboard */}
          <View style={[S.card, { padding: 12 }]}>
            {sorted.map((p, i) => {
              const a = av(p.avatarIdx);
              if (i === 0) {
                return (
                  <View key={p.id} style={{ borderRadius: 16, shadowColor: C.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.30, shadowRadius: 14, elevation: 8, marginBottom: 8 }}>
                    <LinearGradient colors={['rgba(255,232,160,0.65)', 'rgba(212,168,74,0.26)', 'rgba(140,90,18,0.44)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 1.5 }}>
                      <LinearGradient colors={['rgba(212,168,74,0.22)', 'rgba(100,65,10,0.13)', 'rgba(40,25,5,0.24)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 14.5, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
                        <LinearGradient colors={['rgba(255,232,160,0.24)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }} />
                        <Text style={{ fontFamily: F.serifBlack, fontSize: 24, color: C.gold, width: 28, textAlign: 'center' }}>🥇</Text>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,220,140,0.40)' }}>
                          <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
                        </View>
                        <Text style={{ flex: 1, fontFamily: F.sansBold, fontSize: 16, color: C.gold }}>{p.name}</Text>
                        <Text style={{ fontFamily: F.serifBold, fontSize: 26, color: C.gold }}>{p.score}</Text>
                      </LinearGradient>
                    </LinearGradient>
                  </View>
                );
              }
              return (
                <View key={p.id} style={[S.sbRow, { marginBottom: 6 }]}>
                  <Text style={[S.sbRank, { fontSize: 18 }]}>{i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</Text>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{a.emoji}</Text>
                  </View>
                  <Text style={{ flex: 1, fontFamily: F.sansMed, fontSize: 15, color: C.text }}>{p.name}</Text>
                  <Text style={[S.sbPts, { fontSize: 20 }]}>{p.score}</Text>
                </View>
              );
            })}
          </View>

          <SolveButton label="Play Again" onPress={goHome} />
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
  backBtn: { ...T.bodySm, color: C.muted, fontFamily: F.sansMed },

  // ── Typographic scale (single source of truth: the `T` system) ──
  tDisplay:  T.display,
  tH1:       T.h1,
  tH2:       T.h2,
  tH3:       T.h3,
  tOverline: T.overline,
  tBodyLg:   T.bodyLg,
  tBody:     T.body,
  tBodySm:   T.bodySm,
  tCaption:  T.caption,
  tLabel:    T.label,

  // ── Shared text roles (derived from the system) ──
  h2: { ...T.h2, marginBottom: 6 },
  muted: { ...T.bodySm },
  bodyText: { ...T.bodySm },
  sectionLabel: { ...T.overline, color: C.gold, marginBottom: 8 },
  infoCard: { backgroundColor: C.card2, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },

  // Mode cards
  modeCard: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.goldDim, borderRadius: 16, padding: 18, marginBottom: 2 },
  modeCardTitle: { ...T.h3, marginBottom: 4 },
  modeCardDesc: { ...T.bodySm, fontSize: 12, lineHeight: 18 },

  // Buttons
  btnGold: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  btnGoldText: { ...T.button, color: '#1a0f00' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border2, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  btnOutlineText: { ...T.button, color: C.text },
  btnOutlineSm: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border2, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnOutlineSmText: { ...T.button, fontSize: 13, color: C.text },
  btnDisabled: { opacity: 0.4 },
  btnYes: { backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnNo: { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPartly: { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPartlyActive: { backgroundColor: 'rgba(245,158,11,0.25)', borderColor: 'rgba(245,158,11,0.6)' },
  btnSolve: { backgroundColor: C.violet, borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },

  // Input
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 16, fontFamily: 'Outfit_400Regular', marginBottom: 8 },
  fieldLabel: { ...T.label, marginBottom: 8 },

  // Card
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 18, marginBottom: 12 },
  cardTitle: { ...T.overline, fontFamily: F.serifSemi, fontSize: 12, color: C.gold, marginBottom: 14 },

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
  modalTitle: { ...T.h3, fontSize: 18, lineHeight: 24, letterSpacing: 0.3, marginBottom: 4 },
  modalSub: { ...T.bodySm, marginBottom: 18 },
});
