import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../app/firebase";
import "./Hero.css";

interface HeroProps {
    onDismiss: () => void;
}

export default function Hero({ onDismiss }: HeroProps) {
    const handleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // Logged in! App.tsx will handle the state change
        } catch (e) {
            console.error(e);
            alert("Login failed");
        }
    };

    return (
        <div className="hero-overlay">
            <div className="hero-content">
                <div className="hero-badge">PREVIEW MODE</div>
                <h1 className="hero-title">
                    Joe <span className="highlight">"Modular"</span> Micallef
                </h1>
                <h2 className="hero-subhead">Node-based Portfolio</h2>
                <div className="hero-description">
                    <strong>Built by me—concept, design, and code.</strong><br />
                    This is a node-based workflow platform intended for others to create and share process flows.<br />
                    At the moment, it also functions as my portfolio—click Explore to see example workflows and projects.
                </div>
                <div className="hero-cta-group">
                    <button className="cta-primary" onClick={handleLogin}>
                        Sign In with Google
                    </button>
                    <button className="cta-secondary" onClick={onDismiss}>
                        Explore Showcase
                    </button>
                </div>
            </div>
            <div className="hero-footer">
                Built for VFX Professionals & Pipeline Engineers<br />
                Created by Joe Micallef • <a href="mailto:jmicalle@gmail.com" style={{ color: "inherit", textDecoration: "underline" }}>jmicalle@gmail.com</a>
            </div>
        </div>
    );
}
