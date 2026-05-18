# Translating SpessaSynth

This folder contains all locale files used by SpessaSynth.  
You can contribute by adding a **new translation** or improving an **existing one**.

---

## Adding a New Translation

### 1. Prepare the App

- Clone the repository.
- Run:
    - `npm install`
    - `npm run build`
    - `npm start`
- This will open SpessaSynth Local Edition.

### 2. Create a Locale Folder

- Inside this directory, create a folder named:  
  `locale_[2‑letter ISO code]`
- Examples:
    - German -> `locale_de`
    - French -> `locale_fr`

### 3. Copy an Existing Locale

- Copy the entire contents of `locale_en` (or another language you prefer) into your new folder.
  Copying the English locale is recommended as it is always guaranteed to be complete.

### 4. Update `locale.ts`

- Open the `locale.ts` file inside your new folder.
- Rename the exported constant to match your language (in English)
- Examples:
    - `export const localeEnglish` -> `export const localeGerman`
    - `export const localeEnglish` -> `export const localeFrench`

### 5. Translate the Files

- Translate **all strings** in:
    - `locale.ts`
    - All `.ts` files inside the locale folder
- **Do not change object keys (`key: "Translated text"`).**
- Keep placeholders intact (e.g., `Channel {0}`). These are replaced at runtime, for example `Channel 1`.
- Use `\n` for newlines.
- You may add translator comments such as

```ts
// translated by: YourName
```

To your translated files.

### 6. Update `locale_list.ts`

- Add your locale to the list.
- Examples:
    - `de: localeGerman,`
    - `fr: localeFrench,`
- Ensure that it's `imported` from your `locale.ts` file.

### 7. Test Your Changes

- Run:
    - `npm run build:fast`
- Switch the app language to your new locale.
- Test all UI elements, including hover tooltips.
- Note that missing strings automatically fall back to English.
- Check the console for warnings about missing translations.
- Feel free to rebuild as you translate.

### 8. Verify and Build

- Run:
    - `npm run format`
    - `npm run build`
- This will format your code and check if SpessaSynth still builds correctly.
- If there are no errors, then your translation is ready!

### 9. Submit a Pull Request

- Open a [pull request on GitHub](https://github.com/spessasus/SpessaSynth/pulls) with your new locale folder and updates.
- Thank you for contributing to SpessaSynth!

---

## Improving an Existing Translation

### 1. Prepare the App

Follow the same setup steps as in step 1 of [Adding a new Translation](#adding-a-new-translation).

### 2. Identify Missing or Incomplete Files

- Some locales may be missing files entirely.
- Compare your target locale with `locale_en` and copy any missing files.
- The console will warn you about missing translations when the language is selected.

### 3. Translate Missing Strings

- Translate all untranslated or fallback English strings.
- Keep object keys unchanged.
- You may add translator comments if desired.

### 4. Test Your Changes

- Run:
    - `npm run build:fast`
- Switch the app language to your new locale.
- Test all UI elements, including hover tooltips.
- Note that missing strings automatically fall back to English.
- Check the console for warnings about missing translations.
- Feel free to rebuild as you translate.

### 5. Verify and Build

- Run:
    - `npm run format`
    - `npm run build`
- This will format your code and check if SpessaSynth still builds correctly.
- If there are no errors, then your translation is ready!

### 6. Submit a Pull Request

- Open a [pull request on GitHub](https://github.com/spessasus/SpessaSynth/pulls) with your fixes.
- Your improvements help keep SpessaSynth accessible to everyone!

---

If anything in this guide is unclear, feel free to open an issue.
