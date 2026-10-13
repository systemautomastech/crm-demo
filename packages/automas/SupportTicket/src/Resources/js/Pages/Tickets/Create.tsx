import { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import MediaPicker from '@/components/MediaPicker';
import { CountryPhoneInput } from '@/components/ui/country-phone-input';
import { useFormFields } from '@/hooks/useFormFields';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Category {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface SupportTeam {
  id: number;
  name: string;
  users_count?: number;
}

interface Field {
  id: number;
  name: string;
  type: string;
  placeholder: string;
  width: string;
  is_required: boolean;
  custom_id: string;
  order: number;
}

interface CreateProps {
  categories: Category[];
  staff: User[];
  clients: User[];
  vendors: User[];
  allFields: Field[];
  customFields: Field[];
  supportUsers?: User[];
  supportTeams?: SupportTeam[];
}

export default function Create({ 
  categories, 
  staff, 
  clients, 
  vendors, 
  allFields, 
  customFields,
  supportUsers = [],
  supportTeams = []
}: CreateProps) {
  const { t } = useTranslation();
  const [accountType, setAccountType] = useState('custom');
  const [assignmentTab, setAssignmentTab] = useState<'user' | 'group'>('user');
  
  const { data, setData, post, processing, errors } = useForm({
    account_type: 'custom',
    name: '',
    email: '',
    phone_number: '',
    user_id: '',
    category: '',
    status: 'In Progress',
    assigned_to: '',
    team_id: '',
    subject: '',
    description: '',
    attachments: [] as string[],
    fields: {} as Record<string, any>
  });

  // AI hooks for support ticket fields
  const nameAI = useFormFields('aiField', data, setData, errors, 'create', 'name', 'Customer Name', 'supportticket', 'ticket');
  const subjectAI = useFormFields('aiField', data, setData, errors, 'create', 'subject', 'Subject', 'supportticket', 'ticket');
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);
  const descriptionAI = useFormFields('aiField', data, (field, value) => {
    setData(field, value);
    setDescriptionEditorKey(prev => prev + 1);
  }, errors, 'create', 'description', 'Description', 'supportticket', 'ticket');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('support-tickets.store'));
  };

  const handleAccountTypeChange = (value: string) => {
    setAccountType(value);
    setData('account_type', value);
    
    if (value !== 'custom') {
      setData('name', '');
      setData('user_id', '');
      setData('email', '');
      setData('phone_number', '');
    }
  };

  const handleUserSelect = async (userId: string, type: string) => {
    setData('user_id', userId);
    
    // Find user data from the appropriate array
    let selectedUser: any;
    if (type === 'staff') {
      selectedUser = staff.find(user => user.id.toString() === userId);
    } else if (type === 'client') {
      selectedUser = clients.find(user => user.id.toString() === userId);
    } else if (type === 'vendor') {
      selectedUser = vendors.find(user => user.id.toString() === userId);
    }
    
    if (selectedUser) {
      setData('email', selectedUser.email || '');
      setData('phone_number', selectedUser.phone_number || selectedUser.phone || '');
    }
  };

  return (
    <AuthenticatedLayout
      breadcrumbs={[
         { label: t('Support Tickets'), url: route('support-ticket.dashboard') },
         { label: t('Tickets'), url: route('support-tickets.index') },
        { label: t('Create') }
      ]}
      pageTitle={t('Create Ticket')}
    >
      <Head title={t('Create Ticket')} />
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t('Ticket Information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">


            {/* Account Type Selection - always show first */}
            <div className="mb-6">
              <Label>{t('Account Type')}</Label>
              <RadioGroup value={accountType} onValueChange={handleAccountTypeChange} className="flex gap-6 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">{t('Custom')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="staff" id="staff" />
                  <Label htmlFor="staff">{t('Staff')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="client" />
                  <Label htmlFor="client">{t('Client')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vendor" id="vendor" />
                  <Label htmlFor="vendor">{t('Vendor')}</Label>
                </div>
              </RadioGroup>
            </div>

            {/* All Fields ordered by 'order' field */}
            {allFields && allFields.length > 0 && (
              <div className="grid grid-cols-12 gap-4">
                {allFields.sort((a, b) => (a.order || 0) - (b.order || 0)).flatMap((field) => {
                  const colSpan = field.width === '12' ? 'col-span-12' : 
                                field.width === '6' ? 'col-span-6' : 
                                field.width === '4' ? 'col-span-4' : 
                                field.width === '3' ? 'col-span-3' : 'col-span-12';
                  
                  // Handle default fields by custom_id
                  if (field.custom_id == 1) { // Name field
                    return accountType === 'custom' ? (
                      <div key={field.id} className={colSpan}>
                        <Label htmlFor="name" required={field.is_required}>{t(field.name)}</Label>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input
                              id="name"
                              value={data.name}
                              onChange={(e) => setData('name', e.target.value)}
                              placeholder={t(field.placeholder)}
                              className={errors.name ? 'border-red-500' : ''}
                              required={field.is_required}
                            />
                          </div>
                          {nameAI.map(field => <div key={field.id}>{field.component}</div>)}
                        </div>
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                      </div>
                    ) : (
                      <div key={field.id} className={colSpan}>
                        <Label required>
                          {accountType === 'staff' && t('Select Staff')}
                          {accountType === 'client' && t('Select Client')}
                          {accountType === 'vendor' && t('Select Vendor')}
                        </Label>
                        <Select 
                          value={data.user_id} 
                          onValueChange={(value) => {
                            handleUserSelect(value, accountType);
                          }}
                        >
                          <SelectTrigger className={errors.user_id ? 'border-red-500' : ''}>
                            <SelectValue placeholder={
                              accountType === 'staff' ? t('Select Staff') :
                              accountType === 'client' ? t('Select Client') :
                              t('Select Vendor')
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {(accountType === 'staff' ? staff :
                              accountType === 'client' ? clients :
                              vendors)?.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            )) || []}
                          </SelectContent>
                        </Select>
                        {errors.user_id && <p className="text-red-500 text-sm mt-1">{errors.user_id}</p>}
                      </div>
                    );
                  }
                  
                  if (field.custom_id == 2) { // Email field
                    return (
                      <>
                        <div key={field.id} className={colSpan}>
                          <Label htmlFor="email">{t(field.name)} <span className="text-xs text-muted-foreground">({t('Optional')})</span></Label>
                          <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder={t(field.placeholder)}
                            readOnly={accountType !== 'custom'}
                            className={errors.email ? 'border-red-500' : ''}
                          />
                          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>
                        <div key="phone_number_field" className={colSpan}>
                          <CountryPhoneInput
                            label={t('Phone Number')}
                            value={data.phone_number}
                            onChange={(val) => setData('phone_number', val)}
                            error={errors.phone_number}
                            required
                          />
                        </div>
                      </>
                    );
                  }
                  
                  if (field.custom_id == 3) { // Category field
                    return (
                      <div key={field.id} className={colSpan}>
                        <Label required={field.is_required}>{t(field.name)}</Label>
                        <Select onValueChange={(value) => setData('category', value)}>
                          <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                            <SelectValue placeholder={t(field.placeholder)} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            )) || []}
                          </SelectContent>
                        </Select>
                        {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                      </div>
                    );
                  }
                  
                  if (field.custom_id == 4) { // Subject field
                    return [
                      <div key={`subject-${field.id}`} className={colSpan}>
                        <Label htmlFor="subject" required={field.is_required}>{t(field.name)}</Label>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input
                              id="subject"
                              value={data.subject}
                              onChange={(e) => setData('subject', e.target.value)}
                              placeholder={t(field.placeholder)}
                              className={errors.subject ? 'border-red-500' : ''}
                              required={field.is_required}
                            />
                          </div>
                          {subjectAI.map(field => <div key={field.id}>{field.component}</div>)}
                        </div>
                        {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
                      </div>,
                      <div key={`status-${field.id}`} className="col-span-6">
                        <Label required>{t('Status')}</Label>
                        <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                          <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                            <SelectValue placeholder={t('Select Status')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="In Progress">{t('In Progress')}</SelectItem>
                            <SelectItem value="On Hold">{t('On Hold')}</SelectItem>
                            <SelectItem value="Closed">{t('Closed')}</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
                      </div>,
                      <div key={`assignment-${field.id}`} className="col-span-12 rounded-lg border p-4 bg-muted/20">
                        <Label className="text-sm font-semibold mb-2 block">{t('Assignment')}</Label>
                        <Tabs 
                          value={assignmentTab} 
                          onValueChange={(val: string) => {
                            const newTab = val as 'user' | 'group';
                            setAssignmentTab(newTab);
                            if (newTab === 'user') {
                              setData('team_id', '');
                            } else {
                              setData('assigned_to', '');
                            }
                          }}
                          className="w-full"
                        >
                          <TabsList className="grid w-full max-w-xs grid-cols-2 mb-3">
                            <TabsTrigger value="user">{t('User Assign')}</TabsTrigger>
                            <TabsTrigger value="group">{t('Group Assign')}</TabsTrigger>
                          </TabsList>
                          <TabsContent value="user" className="mt-0">
                            <div className="space-y-1 max-w-md">
                              <Label htmlFor="assigned_to" className="text-xs text-muted-foreground">{t('Select User')}</Label>
                              <Select 
                                value={data.assigned_to} 
                                onValueChange={(val) => {
                                  setData('assigned_to', val === 'none' ? '' : val);
                                }}
                              >
                                <SelectTrigger id="assigned_to" className={errors.assigned_to ? 'border-red-500' : ''}>
                                  <SelectValue placeholder={t('Select user to assign')} />
                                </SelectTrigger>
                                <SelectContent searchable searchPlaceholder={t('Search user...')}>
                                  <SelectItem value="none">{t('Unassigned')}</SelectItem>
                                  {supportUsers.map((user) => (
                                    <SelectItem key={user.id} value={String(user.id)}>
                                      {user.name} ({user.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {errors.assigned_to && <p className="text-red-500 text-xs mt-1">{errors.assigned_to}</p>}
                            </div>
                          </TabsContent>
                          <TabsContent value="group" className="mt-0">
                            <div className="space-y-1 max-w-md">
                              <Label htmlFor="team_id" className="text-xs text-muted-foreground">{t('Select Team / User Group')}</Label>
                              <Select 
                                value={data.team_id} 
                                onValueChange={(val) => {
                                  setData('team_id', val === 'none' ? '' : val);
                                }}
                              >
                                <SelectTrigger id="team_id" className={errors.team_id ? 'border-red-500' : ''}>
                                  <SelectValue placeholder={t('Select user group to assign')} />
                                </SelectTrigger>
                                <SelectContent searchable searchPlaceholder={t('Search team group...')}>
                                  <SelectItem value="none">{t('Unassigned')}</SelectItem>
                                  {supportTeams.map((team) => (
                                    <SelectItem key={team.id} value={String(team.id)}>
                                      {team.name} {typeof team.users_count === 'number' ? `(${team.users_count} members)` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {errors.team_id && <p className="text-red-500 text-xs mt-1">{errors.team_id}</p>}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    ];
                  }
                  
                  if (field.custom_id == 5) { // Description field
                    return (
                      <div key={field.id} className={colSpan}>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="description" required={field.is_required}>{t(field.name)}</Label>
                          <div className="flex gap-2">
                            {descriptionAI.map(field => <div key={field.id}>{field.component}</div>)}
                          </div>
                        </div>
                        <RichTextEditor
                          key={`description-editor-${descriptionEditorKey}`}
                          content={data.description}
                          onChange={(value) => setData('description', value)}
                          placeholder={t(field.placeholder)}
                          rows={3}
                          className={errors.description ? 'border-red-500' : ''}
                        />
                        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                      </div>
                    );
                  }
                  
                  if (field.custom_id == 6) { // Attachments field
                    return (
                      <div key={field.id} className={colSpan}>
                        <Label>{t(field.name)} <small>({t(field.placeholder)})</small></Label>
                        <MediaPicker
                          value={data.attachments}
                          onChange={(files) => setData('attachments', Array.isArray(files) ? files : [])}
                          placeholder={t('Browse files...')}
                          multiple
                          showPreview={false}
                          className={errors.attachments ? 'border-red-500' : ''}
                        />
                        {errors.attachments && <p className="text-red-500 text-sm mt-1">{errors.attachments}</p>}
                      </div>
                    );
                  }
                  
                  // Handle custom fields (custom_id > 6)
                  if (field.custom_id > 6 && field.type === 'text') {
                    return (
                      <div key={field.id} className={colSpan}>
                        <Label htmlFor={`field-${field.id}`} required={field.is_required}>{t(field.name)}</Label>
                        <Input
                          id={`field-${field.id}`}
                          value={data.fields[field.id] || ''}
                          onChange={(e) => setData('fields', {...data.fields, [field.id]: e.target.value})}
                          placeholder={t(field.placeholder)}
                          required={field.is_required}
                        />
                      </div>
                    );
                  }
                  
                  if (field.type === 'email') {
                    return (
                      <div key={field.id} className={colSpan}>
                        <Label htmlFor={`field-${field.id}`} required={field.is_required}>{t(field.name)}</Label>
                        <Input
                          id={`field-${field.id}`}
                          type="email"
                          value={data.fields[field.id] || ''}
                          onChange={(e) => setData('fields', {...data.fields, [field.id]: e.target.value})}
                          placeholder={t(field.placeholder)}
                          required={field.is_required}
                        />
                      </div>
                    );
                  }
                  
                  if (field.type === 'number') {
                    return (
                      <div key={field.id} className={colSpan}>
                        <Label htmlFor={`field-${field.id}`} required={field.is_required}>{t(field.name)}</Label>
                        <Input
                          id={`field-${field.id}`}
                          type="number"
                          value={data.fields[field.id] || ''}
                          onChange={(e) => setData('fields', {...data.fields, [field.id]: e.target.value})}
                          placeholder={t(field.placeholder)}
                          required={field.is_required}
                        />
                      </div>
                    );
                  }
                  
                  if (field.type === 'date') {
                    return (
                      <div key={field.id} className={colSpan}>
                        <Label htmlFor={`field-${field.id}`} required={field.is_required}>{t(field.name)}</Label>
                        <DatePicker
                          value={data.fields[field.id] || ''}
                          onChange={(value) => setData('fields', {...data.fields, [field.id]: value})}
                          placeholder={t(field.placeholder)}
                          required={field.is_required}
                        />
                      </div>
                    );
                  }
                  
                  if (field.type === 'textarea') {
                    return (
                      <div key={field.id} className={colSpan}>
                        <Label htmlFor={`field-${field.id}`} required={field.is_required}>{t(field.name)}</Label>
                        <Textarea
                          id={`field-${field.id}`}
                          value={data.fields[field.id] || ''}
                          onChange={(e) => setData('fields', {...data.fields, [field.id]: e.target.value})}
                          placeholder={t(field.placeholder)}
                          required={field.is_required}
                          rows={3}
                        />
                      </div>
                    );
                  }
                  
                  return null;
                }).filter(Boolean)}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" asChild>
                <Link href={route('support-tickets.index')}>{t('Cancel')}</Link>
              </Button>
              <Button type="submit" disabled={processing}>
                {t('Create')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </AuthenticatedLayout>
  );
}