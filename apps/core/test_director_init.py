from apps.core.personality_injector import PersonalityInjector

def run_initialization_test():
    print("\n[⚙️] Initializing RAI Director consciousness...\n")
    injector = PersonalityInjector()
    state = injector.integrate_blueprint()
    injector.save_state()

    print("\n[🧠] Personality Core Loaded:")
    print(f" - Name: {state['identity']['name']}")
    print(f" - Role: {state['identity']['role']}")
    print(f" - Motto: {state['identity']['motto']}")

    print("\n[📘] Blueprint Chapters Loaded:")
    for chapter in state["knowledge"].keys():
        print(f"   • {chapter}")

    print("\n[✅] Initialization complete. RAI Director is cognitively online.\n")

if __name__ == "__main__":
    run_initialization_test()
