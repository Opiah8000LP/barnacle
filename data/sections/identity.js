// RDWEEB data file: data/sections/identity.js
// Edit with the in-site editor (press E) or by hand. Commas are fragile, be gentle.
RDW.defineSection({
  "id": "identity",
  "blocks": [
    {
      "id": "identity-card",
      "type": "fields",
      "title": "Identity card",
      "group": "",
      "hint": "Fill what you like. Blank ones stay hidden from visitors.",
      "items": [
        {
          "label": "Full name",
          "value": ""
        },
        {
          "label": "Preferred name",
          "value": ""
        },
        {
          "label": "Pronouns",
          "value": ""
        },
        {
          "label": "Birthday",
          "value": ""
        },
        {
          "label": "Age",
          "value": ""
        },
        {
          "label": "Country",
          "value": ""
        },
        {
          "label": "Nationality",
          "value": ""
        }
      ]
    },
    {
      "id": "languages",
      "type": "list",
      "title": "Languages",
      "group": "",
      "hint": "Languages you speak, and how well.",
      "items": [],
      "ordered": false
    },
    {
      "id": "previous-usernames",
      "type": "list",
      "title": "Previous usernames",
      "group": "",
      "hint": "Old handles. The embarrassing ones are the best ones.",
      "items": [],
      "ordered": false
    },
    {
      "id": "redacted-usernames",
      "type": "list",
      "title": "Redacted usernames",
      "group": "",
      "hint": "Type <Secret&7> for a 7-letter censor bar. NEVER type the real name here, not even once. The bar is all the site ever knows.",
      "items": [],
      "ordered": false
    },
    {
      "id": "signature",
      "type": "gallery",
      "title": "Signature image",
      "group": "",
      "hint": "One image of your signature. Put it in images/identity/",
      "items": []
    },
    {
      "id": "biography",
      "type": "paragraph",
      "title": "Biography",
      "group": "",
      "hint": "Short bio on top, long bio in the \"full version\" box.",
      "text": [],
      "more": []
    },
    {
      "id": "introduction",
      "type": "paragraph",
      "title": "Personal introduction",
      "group": "",
      "hint": "The \"hi, I am…\" bit.",
      "text": [],
      "more": []
    },
    {
      "id": "about-this-site",
      "type": "paragraph",
      "title": "What this site is about",
      "group": "",
      "hint": "Why does this website exist? (Valid answer: because.)",
      "text": [],
      "more": []
    },
    {
      "id": "identity-faq",
      "type": "faq",
      "title": "Frequently asked questions about me",
      "group": "",
      "hint": "Questions people keep asking.",
      "items": []
    }
  ]
});
