package com.legalconnect.entity;

public class Enums {
    public enum Role { CITIZEN, PROVIDER, ADMIN }
    public enum UserStatus { ACTIVE, SUSPENDED, PENDING }
    public enum ProviderType { ADVOCATE, MEDIATOR, ARBITRATOR, NOTARY, LEGAL_CONSULTANT }
    public enum VerificationStatus { DRAFT, PENDING_REVIEW, CORRECTIONS_REQUIRED, APPROVED, REJECTED }
    public enum CredentialDocumentType { BAR_CERTIFICATE, DEGREE, GOVT_ID, PRACTICE_LICENSE }
    public enum CredentialStatus { PENDING, VERIFIED, REJECTED, CORRECTIONS_REQUIRED }
    public enum IncentiveTier { BRONZE, SILVER, GOLD, PLATINUM }
    public enum ServiceMode { VIDEO, IN_PERSON, PHONE, DOCUMENT_REVIEW }
    public enum DayOfWeekEnum { MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY }
    public enum AppointmentStatus { REQUESTED, CONFIRMED, REJECTED, CANCELLED, RESCHEDULED, COMPLETED }
    public enum RequestUrgency { LOW, MEDIUM, HIGH, URGENT }
    public enum RequestStatus { OPEN, UNDER_REVIEW, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED }
    public enum PaymentStatus { CREATED, PAID, FAILED, REFUNDED }
}
