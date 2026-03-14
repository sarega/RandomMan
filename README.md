# RandomMan

Jackpot-style random web app for numbers, texts, and images.

## Features

- User page for live random picking in the same room/session
- Admin page to edit title, subtitle, note, theme colors, logo, hero image
- Default number range `1-10`, with user-side custom number range/list support only for number mode
- Text pool seeded with 10 Thai sentences and can be expanded
- Image pool with default graphics, image URL support, and upload support
- QR code for the current live room so users can join together
- Local DB stored in `data/store.json`

## Run

```bash
npm install
npm start
```

Open:

- Player page: [http://localhost:3000](http://localhost:3000)
- Admin page: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

## Local storage

- `data/store.json` keeps the app settings, text pool, image pool, session code, and draw history
- Uploaded images are stored in `uploads/`
