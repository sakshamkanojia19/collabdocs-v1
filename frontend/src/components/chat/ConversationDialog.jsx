import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Check, Loader2, LogOut, Search, UserMinus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import api from '../../services/api';
import {
  addParticipantsToGroup,
  createChatGroup,
  leaveChatGroup,
  removeParticipantFromGroup,
  renameChatGroup,
  setActiveChatGroup
} from '../../store/chatSlice';
import { initialsOf } from './chat-utils';

/**
 * One dialog covers both creating a conversation and managing an existing one; the
 * two flows share people search, so splitting them would duplicate most of this.
 */
const ConversationDialog = ({ open, onOpenChange, group = null, context = null }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { creatingGroup, createError } = useSelector((state) => state.chat);

  const isManaging = Boolean(group);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [localError, setLocalError] = useState('');

  const membership = useMemo(
    () => group?.participants?.find((participant) => participant.userId === user?.id) || null,
    [group?.participants, user?.id]
  );
  const canManage = ['owner', 'admin'].includes(membership?.role || '');
  const isOwner = group?.participants?.some(
    (participant) => participant.userId === user?.id && participant.role === 'owner'
  );

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setQuery('');
      setResults([]);
      setSearchError('');
      setLocalError('');
      return;
    }
    setName(group?.name || (context?.documentTitle ? `${context.documentTitle} — discussion` : ''));
    if (!group && context?.defaultParticipants?.length) {
      setSelected(context.defaultParticipants);
    }
  }, [context, group, open]);

  const runSearch = useCallback(async (term) => {
    setSearching(true);
    setSearchError('');
    try {
      const response = await api.get('/auth/users/search', {
        params: { query: term, limit: 8 }
      });
      setResults(response.data.data?.users || []);
    } catch (error) {
      setSearchError(error.response?.data?.message || 'Unable to search people');
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return undefined;
    }
    const timeout = setTimeout(() => runSearch(term), 300);
    return () => clearTimeout(timeout);
  }, [query, runSearch]);

  const existingIds = useMemo(
    () => new Set((group?.participants || []).map((participant) => participant.userId)),
    [group?.participants]
  );

  const addPerson = (person) => {
    const userId = person._id || person.userId;
    if (existingIds.has(userId) || selected.some((entry) => entry.userId === userId)) return;
    setSelected((current) => [
      ...current,
      { userId, name: person.name || person.email, email: person.email }
    ]);
  };

  const submit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (isManaging) {
      if (canManage && name.trim() && name.trim() !== group.name) {
        await dispatch(renameChatGroup({ groupId: group.id, name: name.trim() }));
      }
      if (selected.length > 0) {
        const result = await dispatch(
          addParticipantsToGroup({ groupId: group.id, participants: selected })
        );
        if (addParticipantsToGroup.rejected.match(result)) return;
      }
      onOpenChange(false);
      return;
    }

    if (!name.trim()) {
      setLocalError('Give the conversation a name.');
      return;
    }
    if (selected.length === 0) {
      setLocalError('Add at least one other person.');
      return;
    }

    const payload = { name: name.trim(), participants: selected };
    if (context?.documentId) {
      payload.context = {
        type: 'document',
        documentId: context.documentId,
        documentTitle: context.documentTitle
      };
    }

    const result = await dispatch(createChatGroup(payload));
    if (createChatGroup.fulfilled.match(result)) {
      dispatch(setActiveChatGroup(result.payload.id));
      onOpenChange(false);
    }
  };

  const errorMessage =
    localError || createError?.message || createError?.error || searchError || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-title-sm">
            {isManaging ? 'Conversation details' : 'New conversation'}
          </DialogTitle>
          <DialogDescription className="text-body">
            {isManaging
              ? 'Rename the conversation, add teammates, or manage who has access.'
              : context?.documentId
                ? 'This conversation stays linked to the document, so decisions keep their context.'
                : 'Create a group to keep a discussion in one place.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="conversation-name" className="text-caption font-medium">
              Name
            </Label>
            <Input
              id="conversation-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Q3 launch plan"
              className="h-9 rounded-lg text-body"
              disabled={isManaging && !canManage}
            />
            {isManaging && !canManage && (
              <p className="text-caption text-muted-foreground">
                Only owners and admins can rename this conversation.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="people-search" className="text-caption font-medium">
              Add people
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="people-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or email"
                className="h-9 rounded-lg pl-8 text-body"
              />
            </div>

            {searching && (
              <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Searching…
              </p>
            )}

            {results.length > 0 && (
              <div className="max-h-40 divide-y overflow-y-auto rounded-lg border">
                {results.map((person) => {
                  const personId = person._id || person.userId;
                  const alreadyIn =
                    existingIds.has(personId) ||
                    selected.some((entry) => entry.userId === personId);
                  return (
                    <button
                      key={personId}
                      type="button"
                      onClick={() => addPerson(person)}
                      disabled={alreadyIn}
                      className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors duration-control hover:bg-secondary/60 disabled:opacity-50"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-meta font-semibold text-primary">
                        {initialsOf(person.name || person.email)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium">
                          {person.name || person.email}
                        </span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {person.email}
                        </span>
                      </span>
                      {alreadyIn && (
                        <Check className="size-3.5 shrink-0 text-success" strokeWidth={1.8} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selected.map((person) => (
                  <Badge
                    key={person.userId}
                    variant="secondary"
                    className="gap-1.5 rounded-full py-0.5 pl-2 pr-1 text-caption font-medium"
                  >
                    {person.name}
                    <button
                      type="button"
                      onClick={() =>
                        setSelected((current) =>
                          current.filter((entry) => entry.userId !== person.userId)
                        )
                      }
                      className="rounded-full p-0.5 text-muted-foreground transition-colors duration-control hover:text-destructive"
                      aria-label={`Remove ${person.name}`}
                    >
                      <X className="size-2.5" strokeWidth={1.8} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {isManaging && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-caption font-medium">
                  Members ({group.participants?.length || 0})
                </Label>
                <div className="max-h-44 space-y-0.5 overflow-y-auto">
                  {(group.participants || []).map((participant) => (
                    <div
                      key={participant.userId}
                      className="interactive-row flex items-center gap-2.5 px-1.5 py-1.5"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-meta font-semibold text-primary">
                        {initialsOf(participant.name || participant.email)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium">
                          {participant.name}
                          {participant.userId === user?.id && (
                            <span className="ml-1 text-caption text-muted-foreground">(you)</span>
                          )}
                        </span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {participant.email}
                        </span>
                      </span>
                      <Badge variant="outline" className="shrink-0 rounded-full text-meta capitalize">
                        {participant.role}
                      </Badge>
                      {isOwner && participant.userId !== user?.id && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                          title={`Remove ${participant.name}`}
                          onClick={() =>
                            dispatch(
                              removeParticipantFromGroup({
                                groupId: group.id,
                                participantId: participant.userId
                              })
                            )
                          }
                        >
                          <UserMinus className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {errorMessage && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-caption text-destructive">
              {errorMessage}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {isManaging && !isOwner ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 rounded-lg text-body text-destructive hover:text-destructive"
                onClick={async () => {
                  await dispatch(leaveChatGroup({ groupId: group.id }));
                  onOpenChange(false);
                }}
              >
                <LogOut className="size-3.5" strokeWidth={1.8} /> Leave conversation
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-lg text-body"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 gap-1.5 rounded-full px-4 text-body font-medium"
                disabled={creatingGroup}
              >
                {creatingGroup && <Loader2 className="size-3.5 animate-spin" />}
                {isManaging ? 'Save changes' : 'Create and open'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationDialog;
