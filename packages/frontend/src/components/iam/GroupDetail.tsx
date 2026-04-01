import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import {
	useAddUserToGroup,
	useAttachGroupPolicy,
	useDeleteGroupInlinePolicy,
	useDetachGroupPolicy,
	useGetGroup,
	useGetGroupInlinePolicy,
	useListAttachedGroupPolicies,
	useListGroupInlinePolicies,
	useListPolicies,
	useListUsers,
	usePutGroupInlinePolicy,
	useRemoveUserFromGroup,
} from "@/api/iam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const DEFAULT_POLICY_TEMPLATE = JSON.stringify(
	{
		Version: "2012-10-17",
		Statement: [
			{
				Effect: "Allow",
				Action: "*",
				Resource: "*",
			},
		],
	},
	null,
	2,
);

interface GroupDetailProps {
	groupName: string;
}

export function GroupDetail({ groupName }: GroupDetailProps) {
	const { data, isLoading, error } = useGetGroup(groupName);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (error) {
		return (
			<p className="text-destructive">Error loading group: {error.message}</p>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header with back button */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<Button variant="outline" size="icon" asChild>
						<Link to="/iam">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div>
						<h2 className="text-2xl font-bold">{groupName}</h2>
						<p className="text-sm text-muted-foreground">{data?.group.arn}</p>
					</div>
				</div>
			</div>

			<Tabs defaultValue="info">
				<TabsList>
					<TabsTrigger value="info">Info</TabsTrigger>
					<TabsTrigger value="members">Members</TabsTrigger>
					<TabsTrigger value="inline-policies">Inline Policies</TabsTrigger>
					<TabsTrigger value="managed-policies">Managed Policies</TabsTrigger>
				</TabsList>

				<TabsContent value="info">
					<InfoTab data={data} />
				</TabsContent>
				<TabsContent value="members">
					<MembersTab groupName={groupName} members={data?.members ?? []} />
				</TabsContent>
				<TabsContent value="inline-policies">
					<InlinePoliciesTab groupName={groupName} />
				</TabsContent>
				<TabsContent value="managed-policies">
					<ManagedPoliciesTab groupName={groupName} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

// --- Info Tab ---

function InfoTab({ data }: { data: ReturnType<typeof useGetGroup>["data"] }) {
	if (!data) return null;
	const { group } = data;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Group Details</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							Group Name
						</p>
						<p className="text-sm">{group.groupName}</p>
					</div>
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							Group ID
						</p>
						<p className="text-sm font-mono">{group.groupId}</p>
					</div>
					<div>
						<p className="text-sm font-medium text-muted-foreground">ARN</p>
						<p className="text-sm font-mono break-all">{group.arn}</p>
					</div>
					<div>
						<p className="text-sm font-medium text-muted-foreground">Path</p>
						<p className="text-sm">{group.path ?? "/"}</p>
					</div>
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							Created Date
						</p>
						<p className="text-sm">
							{group.createDate
								? new Date(group.createDate).toLocaleString()
								: "N/A"}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// --- Members Tab ---

interface GroupMember {
	userName: string;
	userId: string;
	arn: string;
}

function MembersTab({
	groupName,
	members,
}: {
	groupName: string;
	members: GroupMember[];
}) {
	const [addOpen, setAddOpen] = useState(false);
	const [removeTarget, setRemoveTarget] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");

	const { data: usersData } = useListUsers();
	const addUser = useAddUserToGroup();
	const removeUser = useRemoveUserFromGroup();

	const memberNames = new Set(members.map((m) => m.userName));
	const availableUsers = (usersData?.users ?? []).filter(
		(u) =>
			!memberNames.has(u.userName) &&
			u.userName.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button onClick={() => setAddOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Add Member
				</Button>
			</div>

			{members.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">
					No members in this group.
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>User Name</TableHead>
							<TableHead>User ID</TableHead>
							<TableHead>ARN</TableHead>
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.map((member) => (
							<TableRow key={member.userName}>
								<TableCell>
									<a
										href={`/iam/users/${member.userName}`}
										className="font-medium text-primary hover:underline"
									>
										{member.userName}
									</a>
								</TableCell>
								<TableCell className="font-mono text-sm">
									{member.userId}
								</TableCell>
								<TableCell className="text-muted-foreground font-mono text-sm">
									{member.arn}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setRemoveTarget(member.userName)}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			{/* Add Member Dialog */}
			<Dialog
				open={addOpen}
				onOpenChange={(open) => {
					setAddOpen(open);
					if (!open) setSearchTerm("");
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Member</DialogTitle>
						<DialogDescription>
							Select a user to add to the group.
						</DialogDescription>
					</DialogHeader>
					<Input
						placeholder="Search users..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
					<div className="max-h-64 overflow-y-auto">
						{availableUsers.length === 0 ? (
							<p className="py-4 text-center text-sm text-muted-foreground">
								No available users found.
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>User Name</TableHead>
										<TableHead className="w-[100px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{availableUsers.map((user) => (
										<TableRow key={user.userName}>
											<TableCell>{user.userName}</TableCell>
											<TableCell>
												<Button
													size="sm"
													onClick={() => {
														addUser.mutate(
															{ groupName, userName: user.userName },
															{
																onSuccess: () => {
																	setAddOpen(false);
																	setSearchTerm("");
																},
															},
														);
													}}
													disabled={addUser.isPending}
												>
													Add
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Remove Member Confirmation Dialog */}
			<Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove Member</DialogTitle>
						<DialogDescription>
							Are you sure you want to remove &quot;{removeTarget}&quot; from
							the group? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRemoveTarget(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (removeTarget) {
									removeUser.mutate(
										{ groupName, userName: removeTarget },
										{ onSuccess: () => setRemoveTarget(null) },
									);
								}
							}}
							disabled={removeUser.isPending}
						>
							Remove
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// --- Inline Policies Tab ---

function InlinePoliciesTab({ groupName }: { groupName: string }) {
	const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
	const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
	const [newPolicyName, setNewPolicyName] = useState("");
	const [policyDoc, setPolicyDoc] = useState(DEFAULT_POLICY_TEMPLATE);

	const { data: policiesData, isLoading } =
		useListGroupInlinePolicies(groupName);
	const { data: selectedPolicyData } = useGetGroupInlinePolicy(
		groupName,
		selectedPolicy ?? "",
	);
	const { data: editingPolicyData } = useGetGroupInlinePolicy(
		groupName,
		editingPolicy ?? "",
	);
	const putPolicy = usePutGroupInlinePolicy();
	const deletePolicy = useDeleteGroupInlinePolicy();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	const policyNames = policiesData?.policyNames ?? [];

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button
					onClick={() => {
						setNewPolicyName("");
						setPolicyDoc(DEFAULT_POLICY_TEMPLATE);
						setCreateOpen(true);
					}}
				>
					<Plus className="mr-2 h-4 w-4" />
					Create Policy
				</Button>
			</div>

			{policyNames.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">
					No inline policies found.
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Policy Name</TableHead>
							<TableHead className="w-[200px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{policyNames.map((name) => (
							<TableRow key={name}>
								<TableCell className="font-medium">{name}</TableCell>
								<TableCell className="space-x-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setSelectedPolicy(name)}
									>
										View
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											setEditingPolicy(name);
											setPolicyDoc("");
										}}
									>
										Edit
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setDeleteTarget(name)}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			{/* View Policy Dialog */}
			<Dialog
				open={!!selectedPolicy}
				onOpenChange={() => setSelectedPolicy(null)}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Policy: {selectedPolicy}</DialogTitle>
					</DialogHeader>
					<Suspense
						fallback={
							<div className="flex items-center justify-center py-8">
								<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
							</div>
						}
					>
						<MonacoEditor
							height="250px"
							language="json"
							theme="vs-dark"
							value={
								selectedPolicyData?.policyDocument
									? tryFormatJson(selectedPolicyData.policyDocument)
									: ""
							}
							options={{
								readOnly: true,
								minimap: { enabled: false },
								automaticLayout: true,
								tabSize: 2,
							}}
						/>
					</Suspense>
				</DialogContent>
			</Dialog>

			{/* Edit Policy Dialog */}
			<Dialog
				open={!!editingPolicy}
				onOpenChange={() => setEditingPolicy(null)}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit Policy: {editingPolicy}</DialogTitle>
					</DialogHeader>
					<Suspense
						fallback={
							<div className="flex items-center justify-center py-8">
								<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
							</div>
						}
					>
						<MonacoEditor
							height="250px"
							language="json"
							theme="vs-dark"
							value={
								policyDoc ||
								(editingPolicyData?.policyDocument
									? tryFormatJson(editingPolicyData.policyDocument)
									: "")
							}
							onChange={(value) => setPolicyDoc(value ?? "")}
							options={{
								minimap: { enabled: false },
								automaticLayout: true,
								tabSize: 2,
							}}
						/>
					</Suspense>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingPolicy(null)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (editingPolicy) {
									const doc =
										policyDoc ||
										(editingPolicyData?.policyDocument
											? tryFormatJson(editingPolicyData.policyDocument)
											: "");
									putPolicy.mutate(
										{
											groupName,
											policyName: editingPolicy,
											policyDocument: doc,
										},
										{ onSuccess: () => setEditingPolicy(null) },
									);
								}
							}}
							disabled={putPolicy.isPending}
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Create Policy Dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Create Inline Policy</DialogTitle>
					</DialogHeader>
					<Input
						placeholder="Policy name"
						value={newPolicyName}
						onChange={(e) => setNewPolicyName(e.target.value)}
					/>
					<Suspense
						fallback={
							<div className="flex items-center justify-center py-8">
								<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
							</div>
						}
					>
						<MonacoEditor
							height="250px"
							language="json"
							theme="vs-dark"
							value={policyDoc}
							onChange={(value) => setPolicyDoc(value ?? "")}
							options={{
								minimap: { enabled: false },
								automaticLayout: true,
								tabSize: 2,
							}}
						/>
					</Suspense>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCreateOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (newPolicyName.trim()) {
									putPolicy.mutate(
										{
											groupName,
											policyName: newPolicyName.trim(),
											policyDocument: policyDoc,
										},
										{
											onSuccess: () => {
												setCreateOpen(false);
												setNewPolicyName("");
												setPolicyDoc(DEFAULT_POLICY_TEMPLATE);
											},
										},
									);
								}
							}}
							disabled={!newPolicyName.trim() || putPolicy.isPending}
						>
							Create
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Policy Confirmation Dialog */}
			<Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Policy</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete policy &quot;{deleteTarget}
							&quot;? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteTarget(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (deleteTarget) {
									deletePolicy.mutate(
										{ groupName, policyName: deleteTarget },
										{ onSuccess: () => setDeleteTarget(null) },
									);
								}
							}}
							disabled={deletePolicy.isPending}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// --- Managed Policies Tab ---

function ManagedPoliciesTab({ groupName }: { groupName: string }) {
	const [attachOpen, setAttachOpen] = useState(false);
	const [detachTarget, setDetachTarget] = useState<{
		name: string;
		arn: string;
	} | null>(null);
	const [searchTerm, setSearchTerm] = useState("");

	const { data: attachedData, isLoading } =
		useListAttachedGroupPolicies(groupName);
	const { data: allPoliciesData } = useListPolicies("Local");
	const attachPolicy = useAttachGroupPolicy();
	const detachPolicy = useDetachGroupPolicy();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	const attachedPolicies = attachedData?.attachedPolicies ?? [];
	const attachedArns = new Set(attachedPolicies.map((p) => p.policyArn));
	const availablePolicies = (allPoliciesData?.policies ?? []).filter(
		(p) =>
			!attachedArns.has(p.arn) &&
			p.policyName.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button onClick={() => setAttachOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Attach Policy
				</Button>
			</div>

			{attachedPolicies.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">
					No managed policies attached.
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Policy Name</TableHead>
							<TableHead>Policy ARN</TableHead>
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{attachedPolicies.map((policy) => (
							<TableRow key={policy.policyArn}>
								<TableCell>
									<a
										href={`/iam/policies/${encodeURIComponent(policy.policyArn)}`}
										className="font-medium text-primary hover:underline"
									>
										{policy.policyName}
									</a>
								</TableCell>
								<TableCell className="text-muted-foreground font-mono text-sm">
									{policy.policyArn}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() =>
											setDetachTarget({
												name: policy.policyName,
												arn: policy.policyArn,
											})
										}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			{/* Attach Policy Dialog */}
			<Dialog
				open={attachOpen}
				onOpenChange={(open) => {
					setAttachOpen(open);
					if (!open) setSearchTerm("");
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Attach Policy</DialogTitle>
						<DialogDescription>
							Select a policy to attach to this group.
						</DialogDescription>
					</DialogHeader>
					<Input
						placeholder="Search policies..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
					<div className="max-h-64 overflow-y-auto">
						{availablePolicies.length === 0 ? (
							<p className="py-4 text-center text-sm text-muted-foreground">
								No available policies found.
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Policy Name</TableHead>
										<TableHead className="w-[100px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{availablePolicies.map((policy) => (
										<TableRow key={policy.arn}>
											<TableCell>{policy.policyName}</TableCell>
											<TableCell>
												<Button
													size="sm"
													onClick={() => {
														attachPolicy.mutate(
															{ groupName, policyArn: policy.arn },
															{
																onSuccess: () => {
																	setAttachOpen(false);
																	setSearchTerm("");
																},
															},
														);
													}}
													disabled={attachPolicy.isPending}
												>
													Attach
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Detach Policy Confirmation Dialog */}
			<Dialog open={!!detachTarget} onOpenChange={() => setDetachTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Detach Policy</DialogTitle>
						<DialogDescription>
							Are you sure you want to detach &quot;{detachTarget?.name}
							&quot; from this group? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDetachTarget(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (detachTarget) {
									detachPolicy.mutate(
										{ groupName, policyArn: detachTarget.arn },
										{ onSuccess: () => setDetachTarget(null) },
									);
								}
							}}
							disabled={detachPolicy.isPending}
						>
							Detach
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// --- Helpers ---

function tryFormatJson(value: string): string {
	try {
		return JSON.stringify(JSON.parse(decodeURIComponent(value)), null, 2);
	} catch {
		try {
			return JSON.stringify(JSON.parse(value), null, 2);
		} catch {
			return value;
		}
	}
}
