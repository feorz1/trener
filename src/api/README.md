# API Boundary

Wave 9 defines the local contract between the app domain and a future backend.

This directory is contract-only:

- DTOs use API-shaped snake_case fields.
- Mappers translate DTOs to the existing local domain entities.
- Repository types mirror the current data layer and add request options for cancellation, idempotency, and cache policy.
- Error helpers normalize API failures into typed `ApiError` values and can be adapted to existing `DataError` values.

No backend provider, auth provider, token storage, persistence migration, network transport, route guard, or app screen behavior is implemented in this wave.
