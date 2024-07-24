"use client";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import Folder from "@/components/FolderIconCard";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Title from "@/components/ui/Title";
import { Button } from "@/components/ui/Button";
import { Loader2, PlusIcon, GridIcon, ListIcon } from "lucide-react";
import { ProjectData } from "@/interfaces/projects";
import { GetProjects } from "@/services/projects";
import { useQuery } from "@tanstack/react-query";
import Toggle from "@/components/ui/Toggle";
import { Table, Column } from "@/components/ui/Table";
import Pagination from "@/components/ui/Pagination";
import DateLabel from "@/components/ui/Date";

export default function Projects() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    const storedViewMode = localStorage.getItem("projectsViewMode") as
      | "grid"
      | "table"
      | null;
    if (storedViewMode) {
      setViewMode(storedViewMode);
    } else {
      setViewMode("table");
    }
  }, []);

  const updateViewMode = (mode: "grid" | "table") => {
    setViewMode(mode);
    localStorage.setItem("projectsViewMode", mode);
  };

  const { data: response, isLoading } = useQuery({
    queryKey: ["projects", page, pageSize],
    queryFn: () => GetProjects(page, pageSize),
  });

  const projects: ProjectData[] = response?.data?.data || [];
  const totalProjects = response?.data?.total_count || 0;
  const totalPages = Math.ceil(totalProjects / pageSize);

  const handleProjectClick = (id: string) => {
    router.push(`/projects/${id}`);
  };

  const newProject = () => {
    router.push("/projects/new");
  };

  if (!isLoading && projects?.length === 0) {
    newProject();
  }

  const breadcrumbItems = [{ label: "Projects", href: "/" }];

  const viewOptions = [
    { value: "grid", label: "Grid", icon: GridIcon },
    { value: "table", label: "Table", icon: ListIcon },
  ];

  const columns: Column<ProjectData>[] = [
    { header: "Project name", accessor: "name" },
    {
      header: "Created at",
      accessor: "created_at",
      label: (value: ProjectData) => (
        <DateLabel dateString={value.created_at} />
      ),
    },
    {
      header: "Updated at",
      accessor: "updated_at",
      label: (value: ProjectData) => (
        <DateLabel dateString={value.updated_at} />
      ),
    },
  ];

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <>
      <Head>
        <title>BambooETL - Projects</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Breadcrumb items={breadcrumbItems} classNames="mb-8" />
      <div className="flex justify-between items-center mb-8">
        <Title margin={false}>My projects</Title>
        <div className="flex space-x-4">
          <Toggle
            options={viewOptions}
            value={viewMode}
            onChange={(value) => updateViewMode(value as "grid" | "table")}
          />
          <Button onClick={newProject} icon={PlusIcon}>
            New project
          </Button>
        </div>
      </div>
      {isLoading && <Loader2 className="w-8 h-8 animate-spin" />}
      {projects.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {projects.map((project) => (
                <Folder
                  key={project.id}
                  name={project.name}
                  onClick={() => handleProjectClick(project.id)}
                />
              ))}
            </div>
          ) : (
            <Table
              data={projects}
              columns={columns}
              onRowClick={(project) => handleProjectClick(project.id)}
            />
          )}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </>
  );
}
