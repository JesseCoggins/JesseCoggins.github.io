# Jesse Coggins GitHub Pages Site

Static portfolio site for [JesseCoggins.github.io](https://JesseCoggins.github.io), built to complement the public GitHub portfolio, LinkedIn profile, and Tableau dashboard.

## Contents

- `index.html`: landing page
- `styles.css`: site styles
- `assets/images/`: selected portfolio visuals
- `assets/resume/`: downloadable resume copy


## Adding projects

Edit `projects.json` to add a project. The homepage reads this file directly; no build command or HTML edits are required. GitHub Pages publishes changes after you commit them.

1. Copy one project record and give it a new permanent ID, such as `PRJ-011`. Never reuse or renumber an existing ID.
2. Set the title, category, tools, tags, finding, finding note, business impact, summary URL and resource links. Use a short qualification where it changes how the result should be interpreted.
3. Add the linked case-study page and any figures before publishing. Relative links should be relative to the website root; external links use HTTPS.
4. Put the record where you want it in the default featured order. Sorting changes the display order, never the ID.

Counts, categories, tags and search update automatically. There is no ten-project limit. Tools are the short visible list; tags can contain additional searchable methods. `links` is a list of objects with `label` and `href`. All required text fields must be nonempty; IDs and summary URLs must be unique.

To preview locally, run `python -m http.server` in the site directory and open the local URL. Opening the HTML as a file cannot load the project data. The desktop table stacks into labeled entries on phones.
