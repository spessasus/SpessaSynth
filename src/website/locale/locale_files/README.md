# Adding a New Locale

### Contributing a New Translation

I welcome contributions from translators! To add a new locale, please follow these steps:

1. **Create a New Locale Folder**
    - Create a new folder in this folder named `locale_[your language 2-letter ISO code]`. For example, for German, the folder name would be `locale_de`.

2. **Copy an Existing Locale**
    - Copy the contents of `locale_en` (or any other existing locale you want to translate from) into your new folder.

3. **Update `locale.js`**
    - Open `locale.js` in your new folder.
    - Rename `export const localeEnglish` in `locale.js` to reflect your language. For example, `localeEnglish` would become `localeGerman` for German.

4. **Translate!**
    - Translate all the strings in the `locale.js` file and all `.js` files in the folders. Make sure to leave the object keys unchanged.
    - You may add comments to indicate who translated the text, e.g., `// translated by: XYZ`.

5. **Update `locale_list.js`**
    - Open `locale_list.js`.
    - Add a new entry for your locale. For example, for German, add: `"de": localeGerman,`.

6. **Submit a Pull Request**
    - After completing the translation and updates, create a pull request with your changes. Thank you for helping SpessaSynth!

**If you have any questions about this guide or something is unclear, let me know by opening an issue!**

<!--don't use github !NOTE here as people might open this README in a text editor-->
> **Note:** Strings containing placeholders, like `Channel {0}`, should keep the placeholders intact. They are used for formatting and should not be altered.
