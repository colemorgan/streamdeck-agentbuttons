import streamDeck from "@elgato/streamdeck";

import { AgentSlotAction } from "./actions/agent-slot.js";

streamDeck.actions.registerAction(new AgentSlotAction());
streamDeck.connect();
