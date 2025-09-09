"use client";

import styles from "./PartnerProfile.module.css";

interface Partner {
  companyName: string;
  businessType: string;
  address: string;
  postcode: string;
  email: string;
  phone: string;
  registeredOn: string;
}

export default function PartnerProfile({ partner }: { partner?: Partner }) {
  // Fallback sample data if no prop is provided
  const profile = partner || {
    companyName: "LetzEat Sushi Bar",
    businessType: "Restaurant",
    address: "123 Melbourne St, VIC",
    postcode: "3000",
    email: "partner@letzeat.com",
    phone: "0412 345 678",
    registeredOn: "2024-03-10",
  };

  return (
    <div className={styles["partner-profile"]}>
      <h2>Partner Profile</h2>

      <div className={styles["profile-section"]}>
        <div className={styles["profileRow"]}>
          <span>Company Name:</span>
          {profile.companyName}
        </div>
        <div className={styles["profile-row"]}>
          <span>Business Type:</span>
          {profile.businessType}
        </div>
        <div className={styles["profile-row"]}>
          <span>Address:</span>
          {profile.address}
        </div>
        <div className={styles["profile-row"]}>
          <span>Postcode:</span>
          {profile.postcode}
        </div>
        <div className={styles["profile-row"]}>
          <span>Email:</span>
          {profile.email}
        </div>
        <div className={styles["profile-row"]}>
          <span>Phone:</span>
          {profile.phone}
        </div>
        <div className={styles["profile-row"]}>
          <span>Registered On:</span>
          {profile.registeredOn}
        </div>
      </div>

      <button className={styles["edit-button"]}>Edit Profile</button>
    </div>
  );
}
