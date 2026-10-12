import type { CallStore } from '../../store/callStore'
import { ExternalLink } from 'lucide-react'

interface IncomingCallerDetailsProps {
    callStore: CallStore
}

interface DetailItemProps {
    label: string
    value: string
}

interface CallerExtra {
    record_type?: unknown
    user_type?: unknown
    lookup_source?: unknown

    extension?: unknown
    caller_id?: unknown
    department?: unknown
    designation?: unknown
    branch?: unknown

    lead_stage?: unknown
    lead_subject?: unknown
    lead_created_at?: unknown
    lead_link?: unknown

    deal_stage?: unknown
    deal_link?: unknown
}

const getTextValue = (
    value: unknown,
): string => {
    if (
        value === null ||
        value === undefined
    ) {
        return ''
    }

    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return String(value)
    }

    return ''
}

const formatCallerType = (
    value: string,
): string => {
    if (!value) {
        return ''
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase(),
        )
}

function DetailItem({
    label,
    value,
}: DetailItemProps) {
    return (
        <div
            className="
                grid min-w-0
                grid-cols-[80px_minmax(0,1fr)]
                items-start gap-3
            "
        >
            <span
                className="
                    pt-0.5 text-[10px]
                    font-medium uppercase
                    tracking-[0.13em]
                    text-slate-500
                "
            >
                {label}
            </span>

            <span
                className="
                    min-w-0 break-words
                    text-right text-[13px]
                    font-medium leading-[18px]
                    text-slate-900
                "
                title={value}
            >
                {value}
            </span>
        </div>
    )
}

export default function IncomingCallerDetails({
    callStore,
}: IncomingCallerDetailsProps) {
    const callerInfo =
        callStore.callerInfo

    const extra = (
        callerInfo?.extra ?? {}
    ) as CallerExtra

    const callerName =
        callerInfo?.name ||
        callStore.contactName ||
        'Unknown'

    const callerType = getTextValue(
        callerInfo?.type,
    )

    const phone = getTextValue(
        callerInfo?.phone,
    )

    const email = getTextValue(
        callerInfo?.email,
    )

    const organization = getTextValue(
        callerInfo?.organization,
    )

    const userType = getTextValue(
        extra.user_type,
    )

    const extension = getTextValue(
        extra.extension,
    )

    const department = getTextValue(
        extra.department,
    )

    const designation = getTextValue(
        extra.designation,
    )

    const branch = getTextValue(
        extra.branch,
    )

    const leadSubject = getTextValue(
        extra.lead_subject,
    )

    const leadStage = getTextValue(
        extra.lead_stage,
    )

    const leadCreatedAt = getTextValue(
        extra.lead_created_at,
    )

    const dealStage = getTextValue(
        extra.deal_stage,
    )

    const leadLink = getTextValue(
        extra.lead_link,
    )

    const dealLink = getTextValue(
        extra.deal_link,
    )

    const recordLink = leadLink || dealLink

    const isUser =
        callerType === 'user' ||
        Boolean(userType)

    const isLead =
        callerType === 'lead'

    const isDeal =
        callerType === 'deal'

    const hasLookupDetails = Boolean(
        email ||
        organization ||
        (isUser && (
            userType ||
            extension ||
            designation ||
            department ||
            branch
        )) ||
        (isLead && (
            leadSubject ||
            leadStage ||
            leadCreatedAt
        )) ||
        (isDeal && dealStage)
    )

    /*
     * Do not render the details container when
     * the caller lookup returned no displayable data.
     */
    if (!hasLookupDetails) {
        return null
    }

    return (
        <div
            className="
                rounded-2xl border
                border-slate-200
                bg-white px-3 py-3
                shadow-sm
            "
        >
            <div className="space-y-1">
                {email && (
                    <DetailItem
                        label="Email"
                        value={email}
                    />
                )}

                {organization && (
                    <DetailItem
                        label="Company"
                        value={organization}
                    />
                )}

                {isUser && userType && (
                    <DetailItem
                        label="Type"
                        value={formatCallerType(userType)}
                    />
                )}

                {isUser && extension && (
                    <DetailItem
                        label="Extension"
                        value={extension}
                    />
                )}

                {isUser && designation && (
                    <DetailItem
                        label="Designation"
                        value={designation}
                    />
                )}

                {isUser && department && (
                    <DetailItem
                        label="Department"
                        value={department}
                    />
                )}

                {isUser && branch && (
                    <DetailItem
                        label="Branch"
                        value={branch}
                    />
                )}

                {isLead && leadSubject && (
                    <DetailItem
                        label="Subject"
                        value={leadSubject}
                    />
                )}

                {isLead && leadStage && (
                    <DetailItem
                        label="Stage"
                        value={leadStage}
                    />
                )}

                {isLead && leadCreatedAt && (
                    <DetailItem
                        label="Created"
                        value={leadCreatedAt}
                    />
                )}

                {isDeal && dealStage && (
                    <DetailItem
                        label="Stage"
                        value={dealStage}
                    />
                )}

                {recordLink && (
                    <div
                        className="
                            grid min-w-0
                            grid-cols-[80px_minmax(0,1fr)]
                            items-center gap-3
                        "
                    >
                        <span
                            className="
                                pt-0.5 text-[10px]
                                font-medium uppercase
                                tracking-[0.13em]
                                text-slate-500
                            "
                        >
                            Record
                        </span>

                        <a
                            href={recordLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                                inline-flex items-center
                                justify-end gap-1.5
                                text-[13px]
                                font-medium
                                text-primary
                                transition-colors
                                hover:text-primary/80
                            "
                        >
                            Open

                            <ExternalLink className="size-3.5" />
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}