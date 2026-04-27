import React, { useState } from 'react';
import './UpdateBanner.css';

const UpdateBanner = () => {
    const [visible, setVisible] = useState(true);

    const dismissBanner = () => {
        setVisible(false);
    };

    return (
        <>{visible && (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(90deg, rgba(255,0,150,1) 0%, rgba(255,0,0,1) 100%)',
                color: 'white',
                padding: '10px',
                animation: 'fadeIn 1s',
                position: 'relative',
                zIndex: 1000,
            }}>
                <span style={{ marginRight: '10px' }}>🎉 New Update: Lettora 1.9.1! 🎉</span>
                <button onClick={dismissBanner} style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    animation: 'fadeIn 1s',
                }}>Dismiss</button>
            </div>
        )}</>
    );
};

export default UpdateBanner;
