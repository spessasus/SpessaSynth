export const keyModifiers = {
    button: {
        title: "Key Modifiers",
        description: "Modify individual key parameters"
    },
    
    mainTitle: "Key Modification editor",
    
    detailedDescription: "This menu allows you to modify a MIDI note on a given channel.\n"
        + "Currently you can modify its velocity and assign a patch (instrument) it uses.\n" +
        " This is especially useful for drums.",
    
    prompt: "What would you like to do?",
    
    selectKey: {
        prompt: "Press the key you want to modify on the keyboard.",
        title: "Select key",
        change: "Change key"
    },
    
    selectedChannel: {
        title: "Selected channel",
        description: "The channel to which the key you want to modify belongs"
    },
    
    selectedKey: {
        title: "Selected key: {0}",
        description: "You have selected the MIDI note number {0}"
    },
    
    modifyKey: {
        title: "Modify a key",
        description: "Modify a single key on a given channel",
        velocity: {
            title: "Velocity override",
            description: "The velocity to use on this key, ignoring the MIDI velocity. Leave at -1 for unchanged"
        },
        program: {
            title: "Program override",
            description: "The program to use on this key. Leave at -1 for unchanged. Note that bank must not be -1 too for it to work."
        },
        bank: {
            title: "Bank override",
            description: "The bank to use on this key. Leave at -1 for unchanged. Note that program must not be -1 too for it to work."
        },
        apply: {
            title: "Apply",
            description: "Apply the selected modifier"
        }
    },
    
    removeModification: {
        title: "Remove modification",
        description: "Remove modification from a single key on a given channel",
        
        remove: {
            title: "Remove",
            description: "Remove this key modifier"
        }
    },
    
    resetModifications: {
        title: "Reset changes",
        description: "Clear and reset all key modifications from all channels",
        
        confirmation: {
            title: "Confirm your actions",
            description: "Are you sure you want to remove ALL modifications?"
        }
    }
};