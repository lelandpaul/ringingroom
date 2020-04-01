# virtual-ringing-room

A space where socially-distanced ringers can practice together.

# Filestructure

.
├── README.md                       => this file
├── requirements.txt                => requirements for virtual environment
├── setup_helper.py                 => script for deployment tasks
├── app.py                          => serverside app
├── migrations/                     => database migrations (maintined by `flask db`)
├── static
│   ├── audio
│   │   ├── (various).mp3           => raw audio assets
│   │   ├── hand.(various audio)    => audiosprite for handbells
│   │   ├── hand.json               => offsets for handbell audiosprite
│   │   ├── tower.(various audio)   => audiosprite for towerbells
│   │   └── tower.json              => offsets for towerbell audiosprite
│   ├── css/                        => compiled css, maintained by sass (don't modify!)
│   ├── sass
│   │   ├── landing.scss            => sass for for static pages
│   │   └── style.scss              => sass for ringing_room itself
│   ├── howler.core.min.js          => javascript audio library
│   ├── images
│   │   ├── favicon/                => favicon assets
│   │   ├── backstroke.png          => rope at backstroke
│   │   └── handstroke.png          => rope at handstroke
│   ├── landing.js                  => client scripts for landing page
│   └── scripts.js                  => client scripts for ringing_room itself
└── templates                       => jinja2 templates for all pages
    ├── about.html
    ├── contact.html
    ├── donate.html
    ├── help.html
    ├── landing_page.html
    └── ringing_room.html
