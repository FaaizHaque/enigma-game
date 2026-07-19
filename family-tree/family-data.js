/* =============================================================================
   FAMILY DATA  —  edit this file to update the tree
   =============================================================================

   HOW TO EDIT (no coding needed — just follow the pattern):

   Every person is an object like this:

     {
       id: "unique-id",          // only needed if another person links to them
       name: "Full Name",
       sex: "m",                 // "m" = male, "f" = female, "" = unknown
       spouses: [ { name: "Spouse Name", note: "optional note" } ],
       note: "free text (e.g. 'died in childhood', 'not married')",
       dob: "1950",              // date of birth   (optional)
       dod: "2019",              // date of death   (optional, leave "" if living)
       profession: "Doctor",     // (optional)
       photo: "photos/name.jpg", // (optional) put image in family-tree/photos/
       bio: "A few sentences about this person.",  // (optional)
       ref: { text: "shown text", to: "some-id" }, // link to another person
       todo: "children — details to be added",     // shows a dashed 'add me' card
       children: [ ...more people... ]
     }

   Only `name` is required. Delete any field you don't need.
   To ADD a person: copy an existing block, change the fields, and drop it into
   the right `children: [ ... ]` list.

   Names written as single capitals / letters (X, xx, AA, BBB...) are treated as
   "name to be added" and shown faintly — replace them when you learn the name.
============================================================================= */

window.FAMILY = {

  /* ---- Intro shown on the landing screen. Edit freely. ---- */
  intro: {
    title: "The Family of Sheikh Mubarak Ali",
    subtitle: "A living family tree — seven branches, many bonds",
    paragraphs: [
      "This tree begins with <b>Sheikh Mubarak Ali</b>, from whom the whole family descends. He had seven children who became the seven branches of the family: four sons — <b>Sheikh Muhammad Ramzan</b>, <b>Sheikh Muhammad Sadiq</b>, <b>Sheikh Muhammad Arif</b>, and <b>Sheikh Muhammad Jaffar</b> — and three daughters — <b>Sughra</b>, <b>Kubra</b>, and <b>Ruqayya</b>.",
      "Over the generations the branches have grown close and often intertwined: cousins married cousins, and a widow once married her late husband's brother. Wherever two branches meet through marriage, you'll see a small link you can tap to jump across the tree.",
      "This is a <b>living document</b>. Some names and details are still missing — shown as faint 'to be added' cards. If you know a birth date, a profession, a photo, or a name, it can be filled in over time so the record stays complete for the generations to come.",
      "<b>How to explore:</b> drag to move around, pinch or scroll to zoom, and tap any name to open that person's profile. Use the search box to find anyone quickly."
    ]
  },

  /* ---- The tree itself ---- */
  root: {
    id: "mubarak",
    name: "Sheikh Mubarak Ali",
    sex: "m",
    note: "The patriarch — the origin of the family.",
    children: [

      /* =====================================================================
         BRANCH 1 — SHEIKH MUHAMMAD RAMZAN
      ===================================================================== */
      {
        id: "b1-ramzan",
        name: "Sheikh Muhammad Ramzan",
        sex: "m",
        spouses: [
          { name: "Daulat", note: "first wife" },
          { name: "Sharifan", note: "widow of his brother Sheikh Muhammad Sadiq (Branch 2)" }
        ],
        note: "Branch 1 of 7.",
        children: [
          { name: "Ibrar", sex: "m", note: "son with Daulat — died in childhood." },
          {
            id: "b1-suriya",
            name: "Suriya Jabeen",
            sex: "f",
            note: "Mother: Sharifan.",
            spouses: [ { name: "Ahsan ul Haque" } ],
            children: [
              {
                name: "Rizwan ul Haque",
                sex: "m",
                spouses: [ { name: "Romana" } ],
                children: [
                  {
                    name: "Hira", sex: "f",
                    spouses: [ { name: "A" } ],
                    children: [ { name: "C", sex: "m", note: "son" } ]
                  },
                  { name: "Maryam", sex: "f", spouses: [ { name: "B" } ] }
                ]
              },
              {
                id: "b1-shazia",
                name: "Shazia",
                sex: "f",
                spouses: [ { name: "Faisal Haque", note: "son of Imdad ul Haque (Branch 3)" } ],
                children: [
                  {
                    name: "Fatima", sex: "f",
                    spouses: [ { name: "Faiz" } ],
                    children: [
                      { name: "Ayla", sex: "f" },
                      { name: "Alina", sex: "f" },
                      { name: "Ayza", sex: "f" }
                    ]
                  },
                  {
                    name: "Sadaf", sex: "f",
                    spouses: [ { name: "Waiz" } ],
                    children: [ { name: "Zaidan", sex: "m" } ]
                  },
                  {
                    name: "Salman", sex: "m",
                    spouses: [ { name: "Nada" } ],
                    children: [ { name: "Dalia", sex: "f" } ]
                  }
                ]
              },
              {
                id: "b1-farrah",
                name: "Farrah",
                sex: "f",
                spouses: [ { name: "Moin ul Haque", note: "son of Anwar ul Haque (Branch 3)" } ],
                children: [
                  {
                    name: "Zara Haque", sex: "f",
                    spouses: [ { name: "Umer Shami" } ],
                    children: [
                      { name: "Ayra", sex: "f" },
                      { name: "Zainab", sex: "f" }
                    ]
                  },
                  { name: "Zain ul Haque", sex: "m", spouses: [ { name: "Hira Noor" } ] },
                  { name: "Faaiz ul Haque", sex: "m" }
                ]
              }
            ]
          },
          {
            name: "Siraj ul Haque",
            sex: "m",
            note: "Mother: Sharifan.",
            spouses: [ { name: "Shameem" } ],
            children: [
              { name: "Zia", sex: "m", note: "not married." },
              { name: "Saira", sex: "f", note: "not married." }
            ]
          },
          {
            name: "Ijaz ul Haque",
            sex: "m",
            note: "Mother: Sharifan.",
            spouses: [ { name: "Zareen" } ],
            children: []
          }
        ]
      },

      /* =====================================================================
         BRANCH 2 — SHEIKH MUHAMMAD SADIQ
      ===================================================================== */
      {
        id: "b2-sadiq",
        name: "Sheikh Muhammad Sadiq",
        sex: "m",
        spouses: [ { name: "Sharifan", note: "after Sadiq's death she married his brother Ramzan (Branch 1)" } ],
        note: "Branch 2 of 7.",
        children: [
          {
            name: "Sheikh Altaf",
            sex: "m",
            note: "Half-brother (through mother Sharifan) to Suriya, Siraj & Ijaz of Branch 1.",
            spouses: [ { name: "Sarwat" } ],
            children: [
              { name: "Anjum", sex: "f", note: "not married." },
              { name: "Talat", sex: "f", note: "not married." },
              { name: "Tahir", sex: "m", note: "not married." },
              {
                name: "Farrah", sex: "f",
                spouses: [ { name: "Shehzad" } ],
                children: [
                  { name: "E", sex: "f" },
                  { name: "F", sex: "f" }
                ]
              }
            ]
          }
        ]
      },

      /* =====================================================================
         BRANCH 3 — SHEIKH MUHAMMAD ARIF
      ===================================================================== */
      {
        id: "b3-arif",
        name: "Sheikh Muhammad Arif",
        sex: "m",
        spouses: [ { name: "Amna Bibi" } ],
        note: "Branch 3 of 7.",
        children: [
          {
            id: "b3-anwar",
            name: "Anwar ul Haque",
            sex: "m",
            spouses: [ { name: "Sajida" } ],
            children: [
              {
                id: "b3-moin",
                name: "Moin ul Haque",
                sex: "m",
                spouses: [ { name: "Farrah", note: "daughter of Ahsan & Suriya (Branch 1)" } ],
                ref: { text: "Their children are shown under Farrah, Branch 1 →", to: "b1-farrah" }
              },
              {
                name: "Mobin ul Haque",
                sex: "m",
                spouses: [ { name: "Sameera" } ],
                children: [
                  { name: "Yahya", sex: "m", spouses: [ { name: "Maryam" } ] },
                  { name: "Ibrahim", sex: "m" },
                  { name: "Saleha", sex: "f" }
                ]
              },
              {
                name: "Mateen ul Haque",
                sex: "m",
                spouses: [ { name: "Amna" } ],
                children: [
                  {
                    name: "Maheen", sex: "f",
                    spouses: [ { name: "Ali" } ],
                    children: [ { name: "Momin", sex: "m" } ]
                  },
                  { name: "Muzna", sex: "f", spouses: [ { name: "Sulaiman" } ] },
                  { name: "Mahnoor", sex: "f" },
                  { name: "Muhammad", sex: "m" }
                ]
              },
              {
                name: "Isma",
                sex: "f",
                spouses: [ { name: "Ilyas" } ],
                children: [
                  { name: "Awais", sex: "m", spouses: [ { name: "Momina" } ] },
                  {
                    name: "Amber", sex: "f",
                    spouses: [ { name: "Muhammad" } ],
                    children: [
                      { name: "Hamdan", sex: "m" },
                      { name: "Hadia", sex: "f" }
                    ]
                  },
                  { name: "Asra", sex: "f", spouses: [ { name: "Bilal" } ] }
                ]
              }
            ]
          },
          {
            id: "b3-riaz",
            name: "Riaz ul Haque",
            sex: "m",
            spouses: [ { name: "Suriya" } ],
            children: [
              {
                name: "Irfan", sex: "m",
                spouses: [ { name: "AA" } ],
                children: [ { name: "AAA", sex: "m" } ]
              },
              {
                name: "Sulaiman", sex: "m",
                spouses: [ { name: "BBB" } ],
                children: [ { name: "CCC", sex: "m" } ]
              },
              {
                name: "Usman", sex: "m",
                spouses: [ { name: "DD" } ],
                children: [
                  { name: "EF" },
                  { name: "FF" }
                ]
              },
              {
                name: "Rubeena", sex: "f",
                spouses: [ { name: "Imran" } ],
                children: [ { name: "GG", sex: "m" } ]
              },
              { name: "Seema", sex: "f" }
            ]
          },
          {
            id: "b3-imdad",
            name: "Imdad ul Haque",
            sex: "m",
            spouses: [ { name: "Naseem", note: "daughter of Sughra (Branch 5)" } ],
            children: [
              {
                id: "b3-faisal",
                name: "Faisal",
                sex: "m",
                spouses: [ { name: "Shazia", note: "daughter of Suriya & Ahsan (Branch 1)" } ],
                ref: { text: "Their children are shown under Shazia, Branch 1 →", to: "b1-shazia" }
              },
              {
                id: "b3-adil",
                name: "Adil",
                sex: "m",
                spouses: [ { name: "Amna", note: "daughter of Habib (Branch 7)" } ],
                children: [
                  { name: "Anum", sex: "f" },
                  { name: "Madiha", sex: "f", spouses: [ { name: "", note: "married — name to be added" } ] },
                  { name: "Zaid", sex: "m" }
                ]
              },
              {
                name: "Asim", sex: "m",
                spouses: [ { name: "Saba" } ],
                children: [
                  { name: "HH", sex: "m" },
                  { name: "Tania", sex: "f" }
                ]
              },
              {
                id: "b3-suhail",
                name: "Suhail",
                sex: "m",
                spouses: [ { name: "Aliya", note: "daughter of Zahoor ul Haque, son of Kubra (Branch 6)" } ],
                children: [
                  { name: "Momin", sex: "m", spouses: [ { name: "Zara" } ] },
                  { name: "Maryam", sex: "f", spouses: [ { name: "Bilawal" } ] },
                  { name: "Hania", sex: "f" }
                ]
              },
              {
                name: "Moqeem", sex: "m",
                spouses: [ { name: "Nadia" } ],
                children: [
                  { name: "Dua", sex: "f" },
                  { name: "Moiz", sex: "m" }
                ]
              }
            ]
          }
        ]
      },

      /* =====================================================================
         BRANCH 4 — SHEIKH JAFFAR
      ===================================================================== */
      {
        id: "b4-jaffar",
        name: "Sheikh Jaffar",
        sex: "m",
        spouses: [ { name: "Mumtaz Begum" } ],
        note: "Branch 4 of 7.",
        children: [
          {
            name: "Naeem", sex: "m",
            spouses: [ { name: "Suriya" } ],
            children: [
              { name: "Ali", sex: "m" },
              { name: "Nabeel", sex: "m" },
              { name: "xx", sex: "f" }
            ]
          },
          {
            name: "Javaid", sex: "m",
            spouses: [ { name: "Shahwar" } ],
            children: [
              { name: "Haroon", sex: "m" },
              { name: "Baba", sex: "m", spouses: [ { name: "xx" } ] },
              { name: "Uzma", sex: "f" }
            ]
          },
          {
            name: "Naveed", sex: "m",
            spouses: [ { name: "Abeeda" } ],
            note: "Family notes also mention 'Zara married Nabeel' — which child this refers to is to be confirmed.",
            children: [
              { name: "Saad", sex: "m", spouses: [ { name: "Wafa" } ] },
              { name: "Salman", sex: "m" },
              { name: "Ammara", sex: "f" },
              { name: "Azar", sex: "f" }
            ]
          },
          {
            name: "Nadeem", sex: "m",
            spouses: [ { name: "Ayesha" } ],
            children: [
              { name: "Nida", sex: "f" },
              { name: "Saba", sex: "f", spouses: [ { name: "X" } ] },
              { name: "Ahmed", sex: "m" }
            ]
          },
          {
            name: "Naheed", sex: "f",
            spouses: [ { name: "Arshad" } ],
            children: [
              { name: "Atif", sex: "m", spouses: [ { name: "Zara" } ], todo: "1 son and 1 daughter — names to be added" },
              { name: "Badar", sex: "m", spouses: [ { name: "Maryam" } ], todo: "1 daughter — name to be added" },
              {
                name: "Sabina", sex: "f",
                spouses: [ { name: "Saleem" } ],
                children: [
                  { name: "Saim", sex: "m" },
                  { name: "X", sex: "f" }
                ]
              },
              { name: "Amina", sex: "f", spouses: [ { name: "Sajjad" } ], todo: "2 daughters — names to be added" },
              { name: "Ayesha", sex: "f", spouses: [ { name: "X" } ], todo: "1 son and 2 daughters — names to be added" }
            ]
          },
          {
            name: "Nayyar", sex: "f",
            spouses: [ { name: "Hamid" } ],
            children: [
              {
                name: "Haris", sex: "m",
                spouses: [ { name: "Humaira" } ],
                children: [
                  { name: "Shamil", sex: "m" },
                  { name: "Saim", sex: "m" },
                  { name: "Ayesha", sex: "f" },
                  { name: "Shiza", sex: "f" }
                ]
              },
              {
                name: "Hisham", sex: "m",
                spouses: [ { name: "Rabia" } ],
                children: [
                  { name: "Minahil", sex: "f" },
                  { name: "Umaima", sex: "f" },
                  { name: "Ibrahim", sex: "m" },
                  { name: "Mustafa", sex: "m" }
                ]
              },
              {
                name: "Sohaib", sex: "m",
                spouses: [ { name: "Sara" } ],
                children: [
                  { name: "Ismail", sex: "m" },
                  { name: "Subhan", sex: "m" },
                  { name: "Yahya", sex: "m" }
                ]
              },
              {
                name: "Madiha", sex: "f",
                spouses: [ { name: "Shahab" } ],
                children: [
                  { name: "Zawar", sex: "m" },
                  { name: "Zohra", sex: "f" }
                ]
              }
            ]
          },
          {
            name: "Narjis", sex: "f",
            spouses: [ { name: "Shahid" } ],
            children: [
              {
                name: "Sidra", sex: "f",
                spouses: [ { name: "Faheem" } ],
                children: [
                  { name: "Zarwa", sex: "f" },
                  { name: "Maheen", sex: "f" }
                ]
              },
              {
                name: "Samreen", sex: "f",
                spouses: [ { name: "Salman" } ],
                children: [
                  { name: "Ismael", sex: "m" },
                  { name: "Daaniya", sex: "f" }
                ]
              },
              { name: "Durya", sex: "f" }
            ]
          },
          {
            name: "Naureen", sex: "f",
            spouses: [ { name: "Khawar" } ],
            children: [
              {
                name: "Umair", sex: "m",
                spouses: [ { name: "Maryam" } ],
                children: [
                  { name: "Mishal", sex: "f" },
                  { name: "X", sex: "m" }
                ]
              },
              { name: "Samra", sex: "f", spouses: [ { name: "X" } ], todo: "3 daughters and 1 son — names to be added" }
            ]
          }
        ]
      },

      /* =====================================================================
         BRANCH 5 — SUGHRA
      ===================================================================== */
      {
        id: "b5-sughra",
        name: "Sughra",
        sex: "f",
        spouses: [ { name: "Abdul Samad" } ],
        note: "Branch 5 of 7.",
        children: [
          { name: "Ikram", sex: "m", spouses: [ { name: "Batool" } ], todo: "children and grandchildren — details to be added" },
          { name: "Inam", sex: "m", spouses: [ { name: "Jahan" } ], todo: "children and grandchildren — details to be added" },
          {
            name: "Nisar", sex: "m",
            spouses: [ { name: "Farrukh" } ],
            children: [
              {
                name: "Imran", sex: "m",
                spouses: [ { name: "Bubble Apa" } ],
                children: [
                  { name: "Seema", sex: "f", spouses: [ { name: "xx" } ], todo: "children — details to be added" },
                  { name: "Zara", sex: "f", spouses: [ { name: "X" } ], todo: "3 children — details to be added" },
                  { name: "Suleiman", sex: "m", spouses: [ { name: "", note: "married — name to be added" } ], todo: "children — details to be added" }
                ]
              },
              { name: "Moeen", sex: "m", spouses: [ { name: "Mona" } ], todo: "3 children — details to be added" },
              { name: "Usman", sex: "m", spouses: [ { name: "X" } ], todo: "children — details to be added" },
              {
                name: "Amna", sex: "f",
                spouses: [ { name: "Bilal" } ],
                children: [
                  { name: "Zainab", sex: "f", spouses: [ { name: "", note: "married — name to be added" } ] },
                  { name: "X", sex: "f" },
                  { name: "X", sex: "m" }
                ]
              }
            ]
          },
          {
            name: "Masroor", sex: "m",
            spouses: [ { name: "Talat" } ],
            children: [
              {
                name: "Umer", sex: "m",
                spouses: [ { name: "", note: "divorced" } ],
                children: [
                  { name: "Jibran", sex: "m" },
                  { name: "X", sex: "f" }
                ]
              },
              { name: "Farooq", sex: "m", spouses: [ { name: "Tehmina" } ], todo: "children — details to be added" },
              { name: "Ayesha", sex: "f", spouses: [ { name: "Tahir" } ], todo: "2 daughters and 1 son — details to be added" },
              { name: "Maryam", sex: "f", spouses: [ { name: "X" } ], todo: "children — details to be added" }
            ]
          },
          { name: "Jamila", sex: "f", spouses: [ { name: "Riffat Pasha" } ], note: "No biological children." },
          {
            name: "Naseem",
            sex: "f",
            spouses: [ { name: "Imdad ul Haque", note: "son of Sheikh Muhammad Arif (Branch 3)" } ],
            ref: { text: "Their five sons are shown under Imdad ul Haque, Branch 3 →", to: "b3-imdad" }
          }
        ]
      },

      /* =====================================================================
         BRANCH 6 — KUBRA
      ===================================================================== */
      {
        id: "b6-kubra",
        name: "Kubra",
        sex: "f",
        spouses: [ { name: "Muhammad Hakeem" } ],
        note: "Branch 6 of 7.",
        children: [
          {
            name: "Sitara", sex: "f",
            spouses: [ { name: "Qaseem Shami" } ],
            children: [
              {
                name: "Amir", sex: "m",
                spouses: [ { name: "Saira" } ],
                children: [
                  { name: "Nofil", sex: "m", spouses: [ { name: "X" } ] },
                  { name: "Talal", sex: "m", spouses: [ { name: "X" } ] },
                  { name: "X", sex: "m" }
                ]
              },
              {
                name: "Asif", sex: "m",
                spouses: [ { name: "Saba" } ],
                children: [
                  { name: "Sameer", sex: "m", spouses: [ { name: "X" } ] },
                  { name: "Amal", sex: "f" }
                ]
              },
              {
                name: "Nadeem", sex: "m",
                spouses: [ { name: "Faiza" } ],
                children: [
                  { name: "X", sex: "f", spouses: [ { name: "A" } ] },
                  { name: "Y", sex: "f", spouses: [ { name: "B" } ] },
                  { name: "Z", sex: "f" }
                ]
              },
              {
                name: "Naeem", sex: "m",
                spouses: [ { name: "A" } ],
                children: [ { name: "X", sex: "f" } ]
              },
              {
                name: "Naveed", sex: "m",
                spouses: [ { name: "X" } ],
                children: [ { name: "X", sex: "f" } ]
              },
              {
                name: "Sameena", sex: "f",
                spouses: [ { name: "Manzoor" } ],
                children: [
                  { name: "Sehrish", sex: "f", spouses: [ { name: "X" } ], todo: "3 children — details to be added" },
                  { name: "Danial", sex: "m", spouses: [ { name: "X" } ] },
                  { name: "X", sex: "m" },
                  { name: "X", sex: "m" }
                ]
              },
              { name: "Tehmina", sex: "f", spouses: [ { name: "Zahid" } ], todo: "2 sons and 1 daughter (all married) — names to be added" },
              {
                name: "Amara", sex: "f",
                spouses: [ { name: "Hamid" } ],
                todo: "all three daughters are married — husbands and children to be added",
                children: [
                  { name: "Javeria", sex: "f" },
                  { name: "X", sex: "f" },
                  { name: "X", sex: "f" }
                ]
              }
            ]
          },
          { name: "Shameem", sex: "f" },
          { name: "Nasreen", sex: "f" },
          { name: "Ahsan", sex: "m" },
          {
            id: "b6-zahoor",
            name: "Zahoor ul Haque",
            sex: "m",
            children: [
              {
                id: "b6-aliya",
                name: "Aliya",
                sex: "f",
                spouses: [ { name: "Suhail", note: "son of Imdad ul Haque (Branch 3)" } ],
                ref: { text: "Their children are shown under Suhail, Branch 3 →", to: "b3-suhail" }
              }
            ]
          },
          { name: "Israr", sex: "m" }
        ]
      },

      /* =====================================================================
         BRANCH 7 — RUQAYYA
      ===================================================================== */
      {
        id: "b7-ruqayya",
        name: "Ruqayya",
        sex: "f",
        spouses: [ { name: "Ghafoor" } ],
        note: "Branch 7 of 7.",
        children: [
          {
            name: "Ata", sex: "m",
            spouses: [ { name: "Atiqa" } ],
            children: [
              { name: "Usman", sex: "m", spouses: [ { name: "X" } ], todo: "children — details to be added" },
              { name: "X", sex: "m", spouses: [ { name: "", note: "married — name to be added" } ], todo: "children — details to be added" },
              {
                id: "b7-irum",
                name: "Irum",
                sex: "f",
                spouses: [ { name: "Babar", note: "first cousin — son of Habib & Altaf Shafi (Branch 7)" } ],
                todo: "two daughters, both married — names and details to be added"
              },
              { name: "Farah", sex: "f", spouses: [ { name: "", note: "married — name to be added" } ], todo: "details to be added" }
            ]
          },
          {
            name: "Habib", sex: "f",
            spouses: [ { name: "Altaf Shafi" } ],
            children: [
              {
                id: "b7-babar",
                name: "Babar",
                sex: "m",
                spouses: [ { name: "Irum", note: "first cousin — daughter of Ata (Branch 7)" } ],
                ref: { text: "Their children are shown under Irum, above →", to: "b7-irum" }
              },
              {
                id: "b7-amna",
                name: "Amna",
                sex: "f",
                spouses: [ { name: "Adil", note: "son of Imdad ul Haque (Branch 3)" } ],
                ref: { text: "Their children are shown under Adil, Branch 3 →", to: "b3-adil" }
              }
            ]
          },
          { name: "Haseeb", sex: "f", spouses: [ { name: "Manzoor" } ], todo: "4 children, all married with children — details to be added" }
        ]
      }

    ]
  }
};
