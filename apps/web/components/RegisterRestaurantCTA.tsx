"use client";

import { useState } from "react";
import styles from "./RegisterRestaurantCTA.module.css";

export default function RegisterRestaurantCTA() {
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    restaurantName: "",
    contactName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send data to an API endpoint
    console.log("Contact form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => {
      setShowContactForm(false);
      setSubmitted(false);
      setFormData({
        restaurantName: "",
        contactName: "",
        email: "",
        phone: "",
        message: "",
      });
    }, 3000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <section className={styles.ctaSection}>
      <div className={styles.ctaContent}>
        <div className={styles.ctaGrid}>
          <div className={styles.ctaText}>
            <h2 className={styles.ctaTitle}>Are You a Restaurant Owner?</h2>
            <p className={styles.ctaSubtitle}>
              Join our platform and maximize your revenue with AI-powered
              discount optimization
            </p>

            <div className={styles.benefitsList}>
              <div className={styles.benefit}>
                <div className={styles.benefitIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.benefitTitle}>
                    ML-Powered Demand Prediction
                  </h3>
                  <p className={styles.benefitDesc}>
                    Smart algorithms predict demand and optimize discounts
                    automatically
                  </p>
                </div>
              </div>

              <div className={styles.benefit}>
                <div className={styles.benefitIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.benefitTitle}>
                    Fill Empty Tables
                  </h3>
                  <p className={styles.benefitDesc}>
                    Turn off-peak hours into revenue opportunities with
                    strategic pricing
                  </p>
                </div>
              </div>

              <div className={styles.benefit}>
                <div className={styles.benefitIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.benefitTitle}>
                    Real-Time Analytics
                  </h3>
                  <p className={styles.benefitDesc}>
                    Track bookings, revenue, and customer insights in one
                    dashboard
                  </p>
                </div>
              </div>

              <div className={styles.benefit}>
                <div className={styles.benefitIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.benefitTitle}>Zero Setup Costs</h3>
                  <p className={styles.benefitDesc}>
                    Get started quickly with no upfront investment required
                  </p>
                </div>
              </div>
            </div>

            <button
              className={styles.ctaButton}
              onClick={() => setShowContactForm(true)}
            >
              Register Your Restaurant
            </button>
          </div>

          <div className={styles.ctaVisual}>
            <div className={styles.statsCard}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>87%</div>
                <div className={styles.statLabel}>Average Occupancy Increase</div>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <div className={styles.statNumber}>$12K+</div>
                <div className={styles.statLabel}>Monthly Revenue Boost</div>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <div className={styles.statNumber}>24/7</div>
                <div className={styles.statLabel}>Automated Management</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showContactForm && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowContactForm(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setShowContactForm(false)}
              aria-label="Close"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {submitted ? (
              <div className={styles.successMessage}>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3>Thank You!</h3>
                <p>We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <>
                <h2 className={styles.modalTitle}>
                  Register Your Restaurant
                </h2>
                <p className={styles.modalSubtitle}>
                  Fill out the form below and we'll contact you to get started
                </p>

                <form onSubmit={handleSubmit} className={styles.contactForm}>
                  <div className={styles.formGroup}>
                    <label htmlFor="restaurantName">Restaurant Name *</label>
                    <input
                      type="text"
                      id="restaurantName"
                      name="restaurantName"
                      value={formData.restaurantName}
                      onChange={handleChange}
                      required
                      placeholder="Enter restaurant name"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="contactName">Your Name *</label>
                    <input
                      type="text"
                      id="contactName"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleChange}
                      required
                      placeholder="Enter your name"
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="your@email.com"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="phone">Phone *</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="message">Message (Optional)</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Tell us about your restaurant..."
                    />
                  </div>

                  <button type="submit" className={styles.submitButton}>
                    Submit Registration
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
