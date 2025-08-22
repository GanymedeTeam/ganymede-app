Your task is to translate all the translations files in @src/locales/**/messages.po

## Guidelines

- Start by executing `pnpm i18n:extract`
- This will update locations of translation use and give any missing translations
- The source is in French

## Format

```
#: x
msgid "y"
msgstr "z"
```

x is the location of this translation.
y is the source (French) string
z is the translated text

## Bonus

You could see translations starting with -#. Those are unused translations. Warn the user about this, but do not remove them. To remove them, you could ask to use `pnpm i18n:extract --clean`.

## Rules

* Use European Portuguese
* Use European Spanish

You can check the source file to know the context and have better context.
