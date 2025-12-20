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
                    Modular <span className="highlight">VFX Flow</span>
                </h1>
                <p className="hero-subtitle">
                    A node-based workspace for visual effects coordination,
                    review, and versioning. Experience the future of studio pipelines.
                </p>
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
                Built for VFX Professionals & Pipeline Engineers
            </div>
        </div>
    );
}
