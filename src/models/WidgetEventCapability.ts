/*
 * Copyright 2020 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Capability } from "..";

export enum EventDirection {
    Send,
    Receive,
}

export class WidgetEventCapability {
    private constructor(
        public readonly direction: EventDirection,
        public readonly eventType: string,
        public readonly isState: boolean,
        public readonly keyStr: string | null,
        public readonly raw: string,
    ) {
    }

    public matchesAsStateEvent(eventType: string, stateKey: string): boolean {
        if (!this.isState) return false; // looking for state, not state
        if (this.eventType !== eventType) return false; // event type mismatch
        if (this.keyStr === null) return true; // all state keys are allowed
        if (this.keyStr === stateKey) return true; // this state key is allowed

        // Default not allowed
        return false;
    }

    public matchesAsRoomEvent(eventType: string, msgtype: string = null): boolean {
        if (this.isState) return false; // looking for not-state, is state
        if (this.eventType !== eventType) return false; // event type mismatch

        if (this.eventType === "m.room.message") {
            if (this.keyStr === null) return true; // all message types are allowed
            if (this.keyStr === msgtype) return true; // this message type is allowed
        } else {
            return true; // already passed the check for if the event is allowed
        }

        // Default not allowed
        return false;
    }

    /**
     * Parses a capabilities request to find all the event capability requests.
     * @param {Iterable<Capability>} capabilities The capabilities requested/to parse.
     * @returns {WidgetEventCapability[]} An array of event capability requests. May be empty, but never null.
     */
    public static findEventCapabilities(capabilities: Iterable<Capability>): WidgetEventCapability[] {
        const parsed: WidgetEventCapability[] = [];
        for (const cap of capabilities) {
            let direction: EventDirection = null;
            let eventSegment: string;
            let isState = false;

            // TODO: Enable support for m.* namespace once the MSC lands.

            if (cap.startsWith("org.matrix.msc2762.send.")) {
                if (cap.startsWith("org.matrix.msc2762.send.event:")) {
                    direction = EventDirection.Send;
                    eventSegment = cap.substring("org.matrix.msc2762.send.event:".length);
                } else if (cap.startsWith("org.matrix.msc2762.send.state_event:")) {
                    direction = EventDirection.Send;
                    isState = true;
                    eventSegment = cap.substring("org.matrix.msc2762.send.state_event:".length);
                }
            } else if (cap.startsWith("org.matrix.msc2762.receive.")) {
                if (cap.startsWith("org.matrix.msc2762.receive.event:")) {
                    direction = EventDirection.Receive;
                    eventSegment = cap.substring("org.matrix.msc2762.receive.event:".length);
                } else if (cap.startsWith("org.matrix.msc2762.receive.state_event:")) {
                    direction = EventDirection.Receive;
                    isState = true;
                    eventSegment = cap.substring("org.matrix.msc2762.receive.state_event:".length);
                }
            }

            if (direction === null) continue;

            let keyStr: string = null;
            if (eventSegment.includes('#')) {
                const p = eventSegment.split('#');
                eventSegment = p[0];
                keyStr = p.slice(1).join('#');
            }

            parsed.push(new WidgetEventCapability(direction, eventSegment, isState, keyStr, cap));
        }
        return parsed;
    }
}
