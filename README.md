# Aprende ruso con Slaviana

Free Russian classes for students in Mexico, run as a volunteer project.
The page tells students at a glance whether class is on, links to the video
call, and shows when the weekly class takes place.

**Site:** <https://profe-slaviana.github.io/aprende-ruso/>

The interface is in Spanish with the key headings repeated in Russian, so
students pick up their first words just by using the page.

## Updating the page

All the content lives in one file, [`datos.yml`](datos.yml). Open it on GitHub
and click the pencil icon. When you're done, click **Commit changes**. The site
updates within a few minutes, and this works from a phone too.

| To… | Change in `datos.yml` |
|---|---|
| Announce a holiday or a day off ahead of time | add an entry under `ausencias` (`desde`, `hasta`, `tipo`, `motivo`) |
| Cancel class right now (e.g. you are ill) | set `estado.modo: sin_clases`, and set it back to `auto` afterwards |
| Show a short note under the status | `estado.mensaje` |
| Change the class day, time or Google Meet link | `clase` (`dia`, `inicio`, `fin`, `enlace`) |
| Change the contact address | `contacto.correo` |
| Show a feedback form | `contacto.formulario` — a Google Form link |

### Feedback form

Create a form at [forms.google.com](https://forms.google.com) (for example
"Nombre" and "Mensaje"), click **Send** → the link icon, and copy the long
link (`https://docs.google.com/forms/d/e/…/viewform`) into
`contacto.formulario`. The form then appears on the page, and answers arrive
in the form's **Responses** tab. To get an email for every answer, turn on
Responses → ⋮ → "Get email notifications for new responses".

With `modo: auto` the status turns green, yellow or red on its own based on
the `ausencias` dates. The "next class" line also skips those days, and on
return it tells students the date you're back.

Mistakes don't break the page silently. If an entry can't be read, a red
"Revisa datos.yml" box at the top of the page names it.

## A note on the call link

The repository and the page are public. Anyone who finds the page can open
the call link, so use a room with a waiting room or "ask to join" enabled
(Google Meet does this by default for guests). If you need a private link,
don't publish it here and send it to students directly instead.

## How it is built

The site is plain HTML, CSS and JavaScript, with no build step. GitHub Pages
serves the repository as is, and `app.js` reads `datos.yml` in the browser
using [js-yaml](https://github.com/nodeca/js-yaml). All times are in Mexico
City time (UTC−6 all year), and students in other time zones also see the
time in their own zone.

To preview it locally:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```
