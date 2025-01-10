export const keyModifiers = {
    button: {
        title: "Modificateur de notes",
        description: "Permet de modifier des notes, individuellement"
    },
    
    mainTitle: "Éditeur de modifications de notes",
    
    detailedDescription: "Ce menu vous permet de modifier une note MIDI d'un canal choisi.\n"
        + "Vous pouvez actuellement modifier sa vélocité et assigner un patch (instrument).\n" +
        "Cette fonction est particulièrement utile pour les percussions.",
    
    prompt: "Que voulez-vous faire ?",
    
    selectKey: {
        prompt: "Appuyez sur la note que vous voulez modifier sur le clavier.",
        title: "Sélectionner une note",
        change: "Changer la note"
    },
    
    selectedChannel: {
        title: "Canal sélectionné",
        description: "Le canal auquel appartient la note à modifier"
    },
    
    selectedKey: {
        title: "Note sélectionnée : {0}",
        description: "Vous avez sélectionné la note MIDI {0}"
    },
    
    modifyKey: {
        title: "Modifier une note",
        description: "Modifie une note d'un canal choisi",
        velocity: {
            title: "Forcer la vélocité",
            description: "Vélocité à utiliser pour cette note, ignorant la vélocité indiquée par les signaux MIDI. La valeur -1 désactive le forçage"
        },
        preset: {
            title: "Forcer le preset",
            description: "Preset à utiliser pour cette note",
            unchanged: "Inchangé"
        },
        apply: {
            title: "Valider",
            description: "Sauvegarder les modificateurs"
        }
    },
    
    removeModification: {
        title: "Enlever un modificateur",
        description: "Enlever un modificateur s'appliquant à une note pour un canal donné",
        
        remove: {
            title: "Enlever",
            description: "Enlever ce modificateur de note"
        }
    },
    
    resetModifications: {
        title: "Tout réinitialiser",
        description: "Enlever tous les modificateurs de notes pour tous les canaux",
        
        confirmation: {
            title: "Confirmation",
            description: "Êtes-vous sûr(e) de bien vouloir supprimer tous les modificateurs ?"
        }
    }
};