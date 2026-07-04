import React from 'react';
import DeploymentMethods from './DeploymentMethods';
import styles from '../styles/GetStarted.module.scss';

export default function GetStarted() {
  return (
    <section className={styles.getStartedSection} id="get-started" aria-label="Get started">
      <div className={styles.inner}>
        <h2 className={styles.heading}>Get Started Now</h2>
        <DeploymentMethods />
      </div>
    </section>
  );
}
