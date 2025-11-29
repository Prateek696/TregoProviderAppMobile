/**
 * Contact utility functions
 */

import { Contact, RelationshipType } from '../types/contact';

/**
 * Get contacts grouped by first letter
 */
export const getContactsGroupedByLetter = (contacts: Contact[]): Record<string, Contact[]> => {
  const grouped: Record<string, Contact[]> = {};
  
  contacts.forEach(contact => {
    const firstLetter = contact.name.charAt(0).toUpperCase();
    if (!grouped[firstLetter]) {
      grouped[firstLetter] = [];
    }
    grouped[firstLetter].push(contact);
  });
  
  // Sort each group alphabetically
  Object.keys(grouped).forEach(letter => {
    grouped[letter].sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return grouped;
};

/**
 * Get alphabetical index from contacts
 */
export const getAlphabeticalIndex = (contacts: Contact[]): string[] => {
  const letters = new Set(contacts.map(c => c.name.charAt(0).toUpperCase()));
  return Array.from(letters).sort();
};

/**
 * Filter contacts by search query
 */
export const filterContacts = (
  contacts: Contact[],
  searchQuery: string
): Contact[] => {
  if (!searchQuery.trim()) return contacts;
  
  const query = searchQuery.toLowerCase();
  return contacts.filter(contact => 
    contact.name.toLowerCase().includes(query) ||
    contact.businessName?.toLowerCase().includes(query) ||
    contact.nif?.includes(query) ||
    contact.billingInfo?.nif?.includes(query) ||
    contact.billingInfo?.taxId?.includes(query) ||
    contact.tags.some(tag => tag.toLowerCase().includes(query)) ||
    contact.phones.some(p => p.number.includes(query)) ||
    contact.emails.some(e => e.email.toLowerCase().includes(query))
  );
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Get relationship badge color
 */
export const getRelationshipColor = (relationship: RelationshipType): string => {
  switch (relationship) {
    case 'Client': return '#3b82f6'; // blue
    case 'Supplier': return '#f97316'; // orange
    case 'Partner': return '#8b5cf6'; // purple
    case 'Internal': return '#10b981'; // green
    default: return '#6b7280'; // gray
  }
};


