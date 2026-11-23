# PetClick Security & Firestore Rules Specification

## 1. Data Invariants
1. **Storefront Publication Integrity**: A product cannot be publicly listed or purchased unless `published == true`, `available == true`, and `price > 0`.
2. **RBAC Anti-Escalation**: A user creating their own `/users/{userId}` profile MUST have `role == 'customer'`. Only verified admins (`isAdmin()`) can create/modify `/admins/{uid}` or promote user roles.
3. **Order & Payment Integrity**: A customer creating an order MUST set `customerId == request.auth.uid` and `status == 'pending_payment'`. Customers can NEVER mark an order as `paid`, `preparing`, `shipped`, or `refunded`.
4. **PII Isolation**: Collections containing PII (`users`, `customers`, `orders`) restrict reads strictly to `isOwner()` or `isStaff()`.
5. **Immutable Audit & Inventory Logs**: `auditLogs` and `inventoryMovements` cannot be edited or deleted once created.
6. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps on client writes must match `request.time`.
7. **Zero Secrets in Firestore**: API keys (`INFINITEPAY_API_KEY`, `CORREIOS_CLIENT_SECRET`, `FIREBASE_PRIVATE_KEY`) and plaintext passwords are NEVER written to Firestore.

## 2. The "Dirty Dozen" Malicious Payloads (Must Return PERMISSION_DENIED)
1. **Privilege Escalation on Signup**: Customer creates `/users/u1` with `{ uid: 'u1', email: 'c@test.com', role: 'admin', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }`.
2. **Admin Registry Injection**: Non-admin writes `/admins/attacker` with `{ uid: 'attacker', role: 'admin', active: true }`.
3. **Self-Paid Order Fraud**: Customer creates `/orders/o1` with `status: 'paid'` instead of `'pending_payment'`.
4. **Order Status Tampering**: Customer updates `/orders/o1` from `pending_payment` to `paid` or `delivered`.
5. **PII Scraping (List)**: Unauthenticated or non-staff user runs `list` on `/customers` or `/users`.
6. **PII Cross-Read (Get)**: Customer A reads `/customers/customerB` or `/orders/orderB`.
7. **Ghost Field Injection (Shadow Update)**: Authenticated user updates `/users/u1` adding unexpected field `isStaffOverride: true`.
8. **ID Poisoning**: Attacker writes document with 500-char ID or invalid characters `../../etc`.
9. **Catalog Price Tampering**: Non-staff customer updates `/products/p1` setting `price: 0.01`.
10. **Audit Log Deletion**: Staff or attacker tries to `delete` or `update` `/auditLogs/log1`.
11. **Fake Review Auto-Approval**: Customer creates `/reviews/r1` with `approved: true` or `customerId: 'someone_else'`.
12. **Unverified Admin Email Spoof**: User with `email == 'juniorwebcode@gmail.com'` and `email_verified == false` attempts admin write.
