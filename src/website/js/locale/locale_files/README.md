# Translating SpessaSynth

### Contributing a New Translation

I welcome contributions from translators! To add a new locale, please follow these steps:

1. **Prepare the app**
    - Clone the repository.
    - `npm install`
    - `npm run build`
    - `npm start`

2. **Create a New Locale Folder**
    - Create a new folder in this folder named `locale_[your language 2-letter ISO code]`. For example, for German, the
      folder name would be `locale_de`.

3. **Copy an Existing Locale**
    - Copy the contents of `locale_en` (or any other existing locale you want to translate from) into your new folder.

4. **Update `locale.js`**
    - Open `locale.js` in your new folder.
    - Rename `export const localeEnglish` in `locale.js` to reflect your language. For example, `localeEnglish` would
      become `localeGerman` for German.

5. **Translate!**
    - Translate all the strings in the `locale.js` file and all `.js` files in the folders. Make sure to leave the
      object keys unchanged.
    - You may add comments to indicate who translated the text, e.g., `// translated by: XYZ`.
    - **Note:** Strings containing placeholders, like `Channel {0}`, should keep the placeholders intact. They are used for
       formatting and should not be altered.
    - **Note 2:** The code sets `textContent` property, so doing HTML characters like `&lt;`
      is not needed.
      For new line, use `\n`

6. **Update `locale_list.js`**
    - Open `locale_list.js`.
    - Add a new entry for your locale. For example, for German, add: `"de": localeGerman,`.

7. **Verify your work**
    - `npm run build` to apply the changes.
    - Change the language to the translated language.
    - Test your changes in the Local Edition!
    - Remember to hover over various controls to see the translated descriptions.

8. **Submit a Pull Request**
    - After completing the translation and updates, create a pull request with your changes. Thank you for helping
      SpessaSynth!

### Fixing an Existing Translation

Some translations may be incomplete, and the system will fall back to English.
Here's how you can fix existing translations:

1. **Prepare the app**
   Follow the same steps as in creating a new translation step 1.

2. **Find missing translation files**
    - Since the translations are split up into parts, some files may be missing in your target language.
   Copy them from `locale_en` or any other language you want to translate from.
    - A tip: After selecting the translation in the local edition, the console should warn about the missing translations.

3. **Translate!**
    - Translate all the untranslated strings in the `locale.js` file and all `.js` files in the folders.
    Make sure to leave the
      object keys unchanged.
    - You may add comments to indicate who translated the text, e.g., `// translated by: XYZ`.
   
4. **Verify your work**
    - compile: `npm run build`
    - Change the language to the translated language.
    - Test your changes in the Local Edition!
    - Remember to hover over various controls to see the translated descriptions.

5. **Submit a Pull Request**
    - After completing the translation and updates, create a pull request with your changes.
    Thank you for helping
      SpessaSynth!

*If you have any questions about this guide or something is unclear, let me know by opening an issue!*
