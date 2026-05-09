// EnigmaGame.js — React Native version of the Enigma 20-Questions game
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as LinkingExpo from 'expo-linking';
import Constants from 'expo-constants';
import { supabase } from './config/supabase';
import { genCode, getInitials, fuzzyMatch } from './utils/helpers';
import { sounds } from './utils/sounds';

// Server URL (Railway in production, localhost for dev)
const SERVER_URL = Constants.expoConfig?.extra?.serverUrl || 'http://localhost:3001';

// Deterministic daily challenge — same secret for everyone on the same calendar day
const getDailyChallenge = () => {
  const now = new Date();
  const dayNum = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const allEntries = [];
  Object.entries(CONTENT_LIBRARY).forEach(([catId, secrets]) => {
    const theme = THEMES.find(t => t.id === catId);
    secrets.forEach(s => allEntries.push({ ...s, categoryId: catId, categoryIcon: theme?.icon || '❓', categoryLabel: theme?.label || catId }));
  });
  return allEntries[dayNum % allEntries.length];
};

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
  ],
};

const DEMO_PLAYERS = [
  { name: 'Ayesha', avatarIdx: 1 },
  { name: 'Marcus', avatarIdx: 2 },
  { name: 'Sofia', avatarIdx: 3 },
  { name: 'Jin', avatarIdx: 4 },
];

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

  // Daily Challenge
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [dailyPlayerName, setDailyPlayerName] = useState('');
  const [dailyQuestions, setDailyQuestions] = useState([]);
  const [dailyInput, setDailyInput] = useState('');
  const [dailySolveInput, setDailySolveInput] = useState('');
  const [dailySolveOpen, setDailySolveOpen] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyStartTime, setDailyStartTime] = useState(null);
  const [dailyResult, setDailyResult] = useState(null);
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);

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
          const updated = payload.new?.data;
          if (!updated) return;
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
  }, [game?.roomCode]);

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
    try { await supabase.from('sessions').upsert({ room_code: g.roomCode, data: g }); } catch {}
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
        pendingSolve: null, roundWinnerId: null, hostConsecutiveMisses: 0, createdAt: new Date().toISOString(),
      };
      await supabase.from('sessions').upsert({ room_code: roomCode, data: session });
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
      const playerId = `p${session.players.length + 1}`;
      const sessionData = {
        ...session,
        players: [...session.players, {
          id: playerId, name: nameInput.trim(), score: 0,
          isHost: false, isEliminated: false, avatarIdx: selectedAvatarIdx,
        }],
      };
      await supabase.from('sessions').upsert({ room_code: roomCode, data: sessionData });
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
    const currHostIdx = game.players.findIndex((p) => p.isHost);
    const newHostIdx = (currHostIdx + 1) % game.players.length;
    const players = game.players.map((p, i) => ({ ...p, isHost: i === newHostIdx, isEliminated: false }));
    const newGame = {
      ...game, players, round: game.round + 1, theme: null, secretAnswer: '',
      hostHint: '', questions: [], currentQuestionerIndex: 0,
      status: 'theme_select', pendingSolve: null, roundWinnerId: undefined, hostConsecutiveMisses: 0,
    };
    setGame(newGame);
    setSelectedTheme(null);
    setScreen('theme');
    await syncGame(newGame);
  };

  const goHome = () => {
    if (game && game.status === 'playing') {
      Alert.alert('Leave Game', 'Leave the game? All progress will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => { setGame(null); setViewerId(null); setScreen('home'); } },
      ]);
    } else {
      setGame(null); setViewerId(null); setScreen('home');
    }
  };

  // ─── Daily Challenge helpers ──────────────────────────────────────────────
  const startDailyChallenge = () => {
    if (!dailyPlayerName.trim()) return;
    setDailyChallenge(getDailyChallenge());
    setDailyQuestions([]);
    setDailyInput('');
    setDailySolveInput('');
    setDailySolveOpen(false);
    setDailyResult(null);
    setDailyStartTime(Date.now());
    setScreen('daily_game');
  };

  const askDailyQuestion = async (question) => {
    const q = question.trim();
    if (!q || dailyLoading || dailyQuestions.length >= 10) return;
    const entry = { id: Date.now(), text: q, answer: null };
    setDailyQuestions(prev => [...prev, entry]);
    setDailyInput('');
    setDailyLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: dailyChallenge.secret, facts: dailyChallenge.facts, category: dailyChallenge.categoryLabel, question: q }),
      });
      const data = await res.json();
      setDailyQuestions(prev => prev.map(qq => qq.id === entry.id ? { ...qq, answer: data.answer } : qq));
    } catch {
      setDailyQuestions(prev => prev.map(qq => qq.id === entry.id ? { ...qq, answer: 'NO' } : qq));
    } finally {
      setDailyLoading(false);
    }
  };

  const finishDailyChallenge = async (guess) => {
    if (!guess.trim() || !dailyChallenge) return;
    const isCorrect = fuzzyMatch(guess.trim(), dailyChallenge.secret);
    const timeSeconds = Math.round((Date.now() - dailyStartTime) / 1000);
    const questionsUsed = dailyQuestions.length;
    setDailyResult({ solved: isCorrect, questionsUsed, timeSeconds });
    setDailySolveOpen(false);
    setScreen('daily_result');
    try {
      await fetch(`${SERVER_URL}/api/daily-result`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: dailyPlayerName.trim(), challengeDate: getDailyDateKey(), solved: isCorrect, questionsUsed, timeSeconds, secret: dailyChallenge.secret }),
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

  // ─── HOME — mode selection ────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <View style={[S.flex, { backgroundColor: C.bg }]}>
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

        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ fontSize: 52, marginBottom: 10 }}>🔍</Text>
            <Text style={{ fontFamily: 'Cinzel_900Black', fontSize: 32, letterSpacing: 6, color: C.gold }}>ENIGMA</Text>
            <Text style={{ fontSize: 11, color: C.muted, letterSpacing: 4, textTransform: 'uppercase', marginTop: 6, fontFamily: 'Outfit_400Regular' }}>
              Reviving the Classic Art of 20 Questions
            </Text>
            <Text style={{ fontSize: 10, color: C.dim, fontFamily: 'Outfit_400Regular', marginTop: 10, letterSpacing: 1 }}>v2.0</Text>
          </View>

          {/* Daily Challenge */}
          <TouchableOpacity onPress={() => setScreen('daily_setup')} style={S.modeCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 32, marginRight: 12 }}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={[S.modeCardTitle, { color: C.gold }]}>Daily Challenge</Text>
                <Text style={S.modeCardDesc}>One secret. 10 AI-answered questions. Solve today's Enigma!</Text>
              </View>
            </View>
            <View style={{ backgroundColor: 'rgba(212,168,74,0.12)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' }}>
              <Text style={{ color: C.gold, fontSize: 11, fontFamily: 'Outfit_700Bold', letterSpacing: 1 }}>TODAY'S CHALLENGE →</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          {/* Multiplayer */}
          <TouchableOpacity onPress={() => setScreen('multi_home')} style={[S.modeCard, { borderColor: 'rgba(124,58,237,0.5)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 32, marginRight: 12 }}>👥</Text>
              <View style={{ flex: 1 }}>
                <Text style={[S.modeCardTitle, { color: C.violet2 }]}>Multiplayer</Text>
                <Text style={S.modeCardDesc}>Create or join a room. One host, all guessers. Up to 20 questions live.</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          {/* Solo — coming soon */}
          <View style={[S.modeCard, { borderColor: C.border, opacity: 0.45 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 32, marginRight: 12 }}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={[S.modeCardTitle, { color: C.muted }]}>Solo Mode</Text>
                <Text style={S.modeCardDesc}>Play alone against an AI host. Coming soon!</Text>
              </View>
            </View>
            <View style={{ backgroundColor: 'rgba(90,90,136,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' }}>
              <Text style={{ color: C.dim, fontSize: 11, fontFamily: 'Outfit_700Bold', letterSpacing: 1 }}>COMING SOON</Text>
            </View>
          </View>

          <TouchableOpacity style={[S.btnOutline, { marginTop: 28, borderColor: 'rgba(200,168,74,0.25)' }]} onPress={() => setHowToPlayOpen(true)}>
            <Text style={[S.btnOutlineText, { color: C.gold }]}>📖  How to Play</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── MULTIPLAYER HOME ─────────────────────────────────────────────────────
  if (screen === 'multi_home') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={S.backBtn}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={S.h2}>Multiplayer</Text>
          <Text style={[S.muted, { marginBottom: 28 }]}>Start a new room or join an existing one with a code.</Text>
          <TouchableOpacity style={S.btnGold} onPress={() => setScreen('create')}>
            <Text style={S.btnGoldText}>✦  Create New Game</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity style={S.btnOutline} onPress={() => setScreen('join')}>
            <Text style={S.btnOutlineText}>Join with a Code</Text>
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={S.backBtn}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ fontSize: 48 }}>📅</Text>
            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 22, color: C.gold, marginTop: 12, letterSpacing: 2 }}>
              Daily Challenge
            </Text>
            <Text style={{ fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular', marginTop: 6 }}>{dateStr}</Text>
          </View>

          <View style={[S.infoCard, { marginBottom: 24 }]}>
            <Text style={{ color: C.text, fontFamily: 'Outfit_600SemiBold', fontSize: 14, marginBottom: 8 }}>How it works</Text>
            <Text style={[S.bodyText, { lineHeight: 22 }]}>
              {'• A secret is chosen for today — same for everyone worldwide.\n'}
              {'• You have '}
              <Text style={{ color: C.gold, fontFamily: 'Outfit_700Bold' }}>10 questions</Text>
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

          <Text style={S.fieldLabel}>Your Name (for the leaderboard)</Text>
          <TextInput
            style={S.input}
            placeholder="Enter your name..."
            placeholderTextColor={C.dim}
            value={dailyPlayerName}
            onChangeText={setDailyPlayerName}
            maxLength={20}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={startDailyChallenge}
          />

          <TouchableOpacity
            style={[S.btnGold, !dailyPlayerName.trim() && S.btnDisabled]}
            onPress={startDailyChallenge}
            disabled={!dailyPlayerName.trim()}
          >
            <Text style={S.btnGoldText}>Start Challenge →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── DAILY GAME ───────────────────────────────────────────────────────────
  if (screen === 'daily_game' && dailyChallenge) {
    const qCount = dailyQuestions.length;
    const qLimit = 10;
    const limitReached = qCount >= qLimit;
    const lastAnswered = dailyQuestions.length > 0 && dailyQuestions[dailyQuestions.length - 1].answer !== null;
    const canAsk = !limitReached && !dailyLoading && (dailyQuestions.length === 0 || lastAnswered);

    return (
      <View style={[S.flex, { backgroundColor: C.bg }]}>
        {/* Solve modal */}
        <Modal visible={dailySolveOpen} animationType="slide" transparent onRequestClose={() => setDailySolveOpen(false)}>
          <View style={S.overlay}>
            <View style={S.modal}>
              <View style={S.modalHandle} />
              <Text style={S.modalTitle}>💡 Make Your Guess</Text>
              <Text style={[S.modalSub, { marginBottom: 16 }]}>What is the secret? Type your answer below.</Text>
              <TextInput
                style={[S.input, { marginBottom: 16 }]}
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
              { text: 'Leave', style: 'destructive', onPress: () => setScreen('home') },
            ]);
          }}>
            <Text style={S.backBtn}>← Home</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 16, color: C.gold }}>Daily Challenge</Text>
          <View style={{
            backgroundColor: qCount >= 8 ? 'rgba(248,81,73,0.12)' : 'rgba(200,168,74,0.12)',
            borderWidth: 1,
            borderColor: qCount >= 8 ? 'rgba(248,81,73,0.4)' : C.goldDim,
            borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 12, fontFamily: 'Outfit_700Bold', color: qCount >= 8 ? C.danger : C.gold }}>
              {qCount}/{qLimit}
            </Text>
          </View>
        </View>

        {/* Category banner */}
        <View style={{
          backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
          paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <Text style={{ fontSize: 22 }}>{dailyChallenge.categoryIcon}</Text>
          <View>
            <Text style={{ fontSize: 10, color: C.dim, fontFamily: 'Outfit_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>
              {dailyChallenge.categoryLabel}
            </Text>
            <Text style={{ fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular', marginTop: 2 }}>
              {dailyChallenge.hint}
            </Text>
          </View>
        </View>

        {/* Q&A feed */}
        <ScrollView
          ref={feedScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          onContentSizeChange={() => feedScrollRef.current?.scrollToEnd({ animated: true })}
        >
          {dailyQuestions.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🤔</Text>
              <Text style={{ color: C.muted, fontFamily: 'Outfit_400Regular', fontSize: 14, textAlign: 'center' }}>
                Ask your first yes/no question to start narrowing it down!
              </Text>
            </View>
          )}
          {dailyQuestions.map((q, i) => (
            <View key={q.id} style={{ marginBottom: 12 }}>
              <View style={{ backgroundColor: C.card2, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 10, color: C.dim, fontFamily: 'Outfit_700Bold', letterSpacing: 2, marginBottom: 4 }}>Q{i + 1}</Text>
                <Text style={{ fontSize: 14, color: C.text, fontFamily: 'Outfit_500Medium' }}>{q.text}</Text>
              </View>
              {q.answer === null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, paddingLeft: 4 }}>
                  <ActivityIndicator size="small" color={C.gold} />
                  <Text style={{ fontSize: 12, color: C.dim, fontFamily: 'Outfit_400Regular' }}>AI is thinking…</Text>
                </View>
              ) : (
                <View style={[S.qBadge, {
                  borderColor: q.answer === 'YES' ? 'rgba(34,197,94,0.4)' : q.answer === 'NO' ? 'rgba(248,81,73,0.4)' : 'rgba(240,160,48,0.4)',
                  backgroundColor: q.answer === 'YES' ? 'rgba(34,197,94,0.08)' : q.answer === 'NO' ? 'rgba(248,81,73,0.08)' : 'rgba(240,160,48,0.08)',
                  marginTop: 6, marginLeft: 4,
                }]}>
                  <Text style={{
                    fontSize: 13, fontFamily: 'Outfit_700Bold',
                    color: q.answer === 'YES' ? C.success : q.answer === 'NO' ? C.danger : C.warn,
                  }}>
                    {q.answer === 'YES' ? '✓ Yes' : q.answer === 'NO' ? '✗ No' : '~ Partly'}
                  </Text>
                </View>
              )}
            </View>
          ))}
          {limitReached && (
            <View style={{ backgroundColor: 'rgba(248,81,73,0.08)', borderWidth: 1, borderColor: 'rgba(248,81,73,0.3)', borderRadius: 10, padding: 14, marginTop: 4 }}>
              <Text style={{ color: C.danger, fontFamily: 'Outfit_600SemiBold', fontSize: 14, textAlign: 'center' }}>
                10 questions used — time to make your guess!
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom input + solve */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{
            backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border2,
            padding: 12, paddingBottom: insets.bottom + 12,
          }}>
            <TouchableOpacity
              style={[S.btnGold, { marginBottom: 10 }]}
              onPress={() => { setDailySolveInput(''); setDailySolveOpen(true); }}
            >
              <Text style={S.btnGoldText}>💡 I Know the Answer — Solve!</Text>
            </TouchableOpacity>
            {!limitReached && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[S.input, { flex: 1, marginBottom: 0 }]}
                  placeholder={canAsk ? 'Ask a yes/no question…' : dailyLoading ? 'Waiting for AI…' : 'Wait for the answer…'}
                  placeholderTextColor={C.dim}
                  value={dailyInput}
                  onChangeText={setDailyInput}
                  editable={canAsk}
                  returnKeyType="send"
                  onSubmitEditing={() => askDailyQuestion(dailyInput)}
                />
                <TouchableOpacity
                  style={[{
                    backgroundColor: C.violet, borderRadius: 12, paddingHorizontal: 16,
                    alignItems: 'center', justifyContent: 'center',
                  }, (!canAsk || !dailyInput.trim()) && { opacity: 0.4 }]}
                  onPress={() => askDailyQuestion(dailyInput)}
                  disabled={!canAsk || !dailyInput.trim()}
                >
                  <Text style={{ color: '#fff', fontSize: 18 }}>↑</Text>
                </TouchableOpacity>
              </View>
            )}
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
      <View style={[S.flex, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
          {/* Result hero */}
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Text style={{ fontSize: 56, marginBottom: 10 }}>{solved ? '🎉' : '😔'}</Text>
            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 24, color: solved ? C.gold : C.muted, letterSpacing: 2 }}>
              {solved ? 'You Solved It!' : 'Better Luck Tomorrow'}
            </Text>
            <Text style={{ fontSize: 13, color: C.muted, fontFamily: 'Outfit_400Regular', marginTop: 8 }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>

          {/* Secret reveal */}
          <View style={[S.infoCard, { marginBottom: 16, alignItems: 'center' }]}>
            <Text style={{ fontSize: 10, color: C.dim, fontFamily: 'Outfit_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
              Today's Secret
            </Text>
            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 20, color: C.gold, textAlign: 'center' }}>
              {dailyChallenge.secret}
            </Text>
            <Text style={{ fontSize: 12, color: C.muted, fontFamily: 'Outfit_400Regular', marginTop: 6, textAlign: 'center' }}>
              {dailyChallenge.categoryIcon} {dailyChallenge.categoryLabel}
            </Text>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <View style={[S.infoCard, { flex: 1, alignItems: 'center' }]}>
              <Text style={{ fontSize: 24, fontFamily: 'Cinzel_700Bold', color: C.violet2 }}>{questionsUsed}</Text>
              <Text style={{ fontSize: 11, color: C.dim, fontFamily: 'Outfit_400Regular', textTransform: 'uppercase', letterSpacing: 1 }}>Questions</Text>
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
                  <Text style={{ fontSize: 12, color: C.dim, fontFamily: 'Outfit_400Regular' }}>
                    {Math.floor(row.time_seconds / 60) > 0 ? `${Math.floor(row.time_seconds / 60)}m ` : ''}{row.time_seconds % 60}s
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={S.btnGold} onPress={() => setScreen('home')}>
            <Text style={S.btnGoldText}>Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.btnOutline, { marginTop: 10 }]} onPress={() => setScreen('multi_home')}>
            <Text style={S.btnOutlineText}>👥 Play Multiplayer</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────
  if (screen === 'create') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.flex, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <View style={S.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('multi_home')}>
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
            <TouchableOpacity onPress={() => setScreen('multi_home')}>
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
    const hostWon = !winner;
    const sorted = [...game.players].sort((a, b) => b.score - a.score);

    return (
      <View style={[S.flex, { backgroundColor: C.bg }]}>
        <SBar />
        <ScrollView contentContainerStyle={[S.screen, { paddingTop: 4, paddingBottom: insets.bottom + 24 }]}>
          {/* Winner block */}
          <View style={{ alignItems: 'center', padding: 28, backgroundColor: 'rgba(200,168,74,0.06)', borderWidth: 1, borderColor: C.goldDim, borderRadius: 20, marginVertical: 16 }}>
            <Text style={{ fontSize: 52, marginBottom: 8 }}>{hostWon ? '🎩' : '🎉'}</Text>
            <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: 26, color: C.gold }}>
              {hostWon ? host?.name : winner?.name}
            </Text>
            <Text style={{ fontSize: 10, color: C.goldDim, letterSpacing: 3, textTransform: 'uppercase', marginTop: 8, fontFamily: 'Outfit_400Regular' }}>
              {hostWon ? 'defended the secret — nobody cracked it!' : 'cracked the secret!'}
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
                    {!game.roundWinnerId && p.isHost && <Text style={{ fontSize: 11, color: C.gold, fontFamily: 'Outfit_400Regular' }}>+5 pts (host win)</Text>}
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

  // Mode cards
  modeCard: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.goldDim, borderRadius: 16, padding: 18, marginBottom: 2 },
  modeCardTitle: { fontFamily: 'Cinzel_700Bold', fontSize: 16, letterSpacing: 1, marginBottom: 4 },
  modeCardDesc: { fontSize: 12, color: C.muted, fontFamily: 'Outfit_400Regular', lineHeight: 18 },

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
