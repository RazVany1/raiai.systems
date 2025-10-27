import os
import json

class BlueprintLoader:
    """
    Loads and structures RAI Director blueprint chapters
    into a usable knowledge base for the AI core.
    """

    def __init__(self, base_path="blueprints/rai_director/text"):
        self.base_path = base_path
        self.chapters = {}
        self.summary = {}

    def load_all(self):
        """Read all chapter text files and store them as structured data."""
        for filename in sorted(os.listdir(self.base_path)):
            if filename.endswith(".txt"):
                path = os.path.join(self.base_path, filename)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                chapter_name = filename.replace(".txt", "")
                self.chapters[chapter_name] = content

        self._generate_summary()
        return self.chapters

    def _generate_summary(self):
        """Generate a summary of chapters and key phrases."""
        for name, text in self.chapters.items():
            lines = text.splitlines()
            title = lines[0].replace("#", "").strip() if lines else name
            key_points = [line.strip() for line in lines if line.strip().startswith("**")]
            self.summary[name] = {
                "title": title,
                "key_points": key_points[:5]
            }

    def export_json(self, output_file="blueprints/rai_director/blueprint_data.json"):
        """Export parsed blueprint content to JSON for AI ingestion."""
        data = {
            "chapters": self.chapters,
            "summary": self.summary
        }
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"[✓] Blueprint exported → {output_file}")

if __name__ == "__main__":
    loader = BlueprintLoader()
    loader.load_all()
    loader.export_json()
