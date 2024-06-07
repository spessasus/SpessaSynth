# Locale folder
This folder contains all the locale for SpessaSynth application.
### How to add new locale
1. create a new folder named `locale_[your language ISO code]` for example for polish it would be `locale_pl`
2. copy the contents of `locale_en` there
3. rename all `export const` to your language name in english. ex. `localeEnglish` would be `localePolish`
4. translate all the strings

>Note: strings like `Channel {0}` should have `{0}` preserved as it's used in formatting