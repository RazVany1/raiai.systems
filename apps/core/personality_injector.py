import json
from apps.core.blueprint_loader import BlueprintLoader

class PersonalityInjector:
    """
    Merges the core personality (identity, ethics, tone) 
    with the structural blueprint knowledge.
    Creates the initial state of the RAI Director consciousness.
    """

    def __init__(self, personality_file="configs/personality.core.json"):
        with open(personality_file, "r", encoding="utf-8") as f:
            self.personality = json.load(f)

        self.blueprint = None
        self.director_state = {}

    def integrate_blueprint(self):
        """Load and integrate all blueprint chapters into the personality structure."""
        loader = BlueprintLoader()
        self.blueprint = loader.load_all()

        self.director_state = {
            "identity": self.personality["identity"],
            "values": self.personality["values"],
            "ethic_rules": self.personality["ethic_rules"],
            "tone": self.personality["tone"],
            "knowledge": self.blueprint
        }
        return self.director_state

    def save_state(self, output_file="apps/core/director_state.json"):
        """Save the integrated consciousness into a JSON file."""
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(self.director_state, f, indent=2, ensure_ascii=False)
        print(f"[✓] Director state initialized → {output_file}")

if __name__ == "__main__":
    injector = PersonalityInjector()
    state = injector.integrate_blueprint()
    injector.save_state()
