# Secrets

This folder contains encrypted secrets using [SOPS](https://github.com/mozilla/sops) and [age](https://github.com/FiloSottile/age).

## Setup

1. Install SOPS and age:

   ```sh
   brew install sops age
   ```

2. Generate an age key (if you don't have one):

   ```sh
   mkdir -p ~/.age
   age-keygen -o ~/.age/key.txt
   ```

3. Get your public key and update `.sops.yaml`:

   ```sh
   age-keygen -y ~/.age/key.txt
   ```

4. Set the `SOPS_AGE_KEY_FILE` environment variable (add to your shell profile):

   ```sh
   export SOPS_AGE_KEY_FILE=~/.age/key.txt
   ```

## Usage

### Create a new secrets file

```sh
sops secrets/example.sops.json
```

This opens your `$EDITOR` with a new encrypted file. Add your secrets as JSON.

### Edit an existing secrets file

```sh
sops secrets/google.sops.json
```

### View decrypted contents

```sh
sops -d secrets/google.sops.json
```

### Decrypt to environment variables

The `.envrc` file uses `sops -d` to decrypt secrets and export them as environment variables.

## Files

- `google.sops.json` - Google OAuth credentials for Gmail API
