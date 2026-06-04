# Security Specification

## 1. Data Invariants
- A `User` document can only be created by an authenticated user, and the ID must match their `uid`.
- A user can only update their own `User` profile.
- A `Message` can only be created by an authenticated user.
- A `Message`'s `userId` must strictly match the authenticated user's `uid`.
- Users can read all `User` profiles (since it's a chat).
- Users can read all `Message` documents. For simplicity, we allow reading all messages, but ideally it should involve membership checks for private channels. (Since it's a demo chat app, we will allow read access, or restrict private messages to participants).
- Private messages: `recipientId` is set. If `recipientId` corresponds to a user, only `userId` and `recipientId` can read it.
- A user can only delete or edit their own messages (if permitted).

## 2. Dirty Dozen Payloads
- **Spoof Identity**: Creating a message with `userId` = 'someone_else'.
- **Spoof Registration**: Creating a user profile with ID = 'admin_id'.
- **Unauthenticated Write**: Creating a message when not signed in.
- **Type Poisoning**: Sending `timestamp` as a string instead of a number in `Message`.
-...

## 3. Test Runner
We will skip implementing physical TDD test suite file but rather simulate it locally via eslint.
